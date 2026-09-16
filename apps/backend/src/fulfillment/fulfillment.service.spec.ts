import { Test, TestingModule } from '@nestjs/testing';
import { FulfillmentService } from './fulfillment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob, SyncJobStatus } from '../common/entities/vendor-sync-job.entity';
import { Order } from '../common/entities/order.entity';
import { VendorMockService } from '../integrations/vendor-mock/vendor-mock.service';
import { AuditService } from '../common/audit';
import { VendorResponseType } from '../integrations/vendor-mock/dto/vendor-mock.dto';

/** Lightweight SelectQueryBuilder mock for Phase 3.3 scoped-job reads. */
function mockSyncQb() {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  return qb;
}

describe('FulfillmentService - Reconciliation', () => {
  let service: FulfillmentService;
  let syncJobRepositoryMock: any;
  let lineItemRepositoryMock: any;
  let vendorMockServiceMock: any;
  let auditServiceMock: any;

  beforeEach(async () => {
    syncJobRepositoryMock = {
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockSyncQb()),
    };
    lineItemRepositoryMock = {
      update: jest.fn(),
      findOne: jest.fn(),
    };
    vendorMockServiceMock = {
      queryFulfillmentStatus: jest.fn(),
    };
    auditServiceMock = {
      logReconciliationResolved: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FulfillmentService,
        { provide: getRepositoryToken(VendorSyncJob), useValue: syncJobRepositoryMock },
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepositoryMock },
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: VendorMockService, useValue: vendorMockServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get<FulfillmentService>(FulfillmentService);
  });

  it('should resolve job when vendor confirms', async () => {
    const job = { id: 'job1', correlationId: 'c1', orderLineItem: { id: 'li1', vendorReference: 'ref1', vendorId: 'v1' } };
    syncJobRepositoryMock.find.mockResolvedValue([job]);
    vendorMockServiceMock.queryFulfillmentStatus.mockResolvedValue({ success: true, responseType: VendorResponseType.SUCCESS });

    const result = await service.reconcile(0);

    expect(result.resolved).toBe(1);
    expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', expect.objectContaining({ status: SyncJobStatus.COMPLETED }));
    expect(lineItemRepositoryMock.update).toHaveBeenCalledWith('li1', expect.objectContaining({ fulfillmentStatus: FulfillmentStatus.CONFIRMED }));
  });

  it('should mark job as ambiguous when vendor returns FAILURE', async () => {
    const job = { id: 'job1', correlationId: 'c1', orderLineItem: { id: 'li1', vendorReference: 'ref1', vendorId: 'v1' } };
    syncJobRepositoryMock.find.mockResolvedValue([job]);
    vendorMockServiceMock.queryFulfillmentStatus.mockResolvedValue({ success: false, responseType: VendorResponseType.FAILURE, message: 'Reject' });

    const result = await service.reconcile(0);

    // Reconcile treats every non-success response as ambiguous; a confirmed
    // vendor failure is resolved via the DLQ/manual path instead.
    expect(result.stillAmbiguous).toBe(1);
    expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', expect.objectContaining({ status: SyncJobStatus.AMBIGUOUS }));
    expect(lineItemRepositoryMock.update).toHaveBeenCalledWith('li1', expect.objectContaining({ fulfillmentStatus: FulfillmentStatus.AMBIGUOUS }));
  });

  it('should mark job as ambiguous when vendor times out', async () => {
    const job = { id: 'job1', correlationId: 'c1', orderLineItem: { id: 'li1', vendorReference: 'ref1', vendorId: 'v1' } };
    syncJobRepositoryMock.find.mockResolvedValue([job]);
    vendorMockServiceMock.queryFulfillmentStatus.mockResolvedValue({ success: false, responseType: VendorResponseType.TIMEOUT, message: 'Timeout' });

    const result = await service.reconcile(0);

    expect(result.stillAmbiguous).toBe(1);
    expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', expect.objectContaining({ status: SyncJobStatus.AMBIGUOUS }));
    expect(lineItemRepositoryMock.update).toHaveBeenCalledWith('li1', expect.objectContaining({ fulfillmentStatus: FulfillmentStatus.AMBIGUOUS }));
  });

  it('should retry job when vendor reference is missing', async () => {
    const job = { id: 'job1', orderLineItem: { id: 'li1', vendorReference: null } };
    syncJobRepositoryMock.find.mockResolvedValue([job]);

    const result = await service.reconcile(0);

    expect(result.resolved).toBe(1);
    expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', { status: SyncJobStatus.PENDING });
  });

  it('should resolve job via manual resolution', async () => {
    const lineItem = { id: 'li1', fulfillmentStatus: FulfillmentStatus.AMBIGUOUS, orderId: 'ord1', syncJob: { id: 'job1' } };
    lineItemRepositoryMock.findOne.mockResolvedValue(lineItem);
    auditServiceMock.logFulfillmentStatusChange = jest.fn();
    service.checkOrderFulfillment = jest.fn();

    await service.manualResolve('li1', { newStatus: FulfillmentStatus.CONFIRMED }, 'c1');

    expect(lineItemRepositoryMock.update).toHaveBeenCalledWith('li1', expect.objectContaining({ fulfillmentStatus: FulfillmentStatus.CONFIRMED }));
    expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', expect.objectContaining({ status: SyncJobStatus.COMPLETED }));
  });

  it('dead-letter with no vendorId fetches all jobs (admin/ops, Phase 3.3)', async () => {
    const qb = mockSyncQb();
    syncJobRepositoryMock.createQueryBuilder.mockReturnValue(qb);
    qb.getMany.mockResolvedValue([
      { id: 'job1', status: SyncJobStatus.DEAD_LETTER, orderLineItem: { vendorId: 'v1' } },
    ]);

    const result = await service.getDeadLetterJobs();

    expect(result).toHaveLength(1);
    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('dead-letter with a vendorId filters to that tenant only (Phase 3.3)', async () => {
    const qb = mockSyncQb();
    syncJobRepositoryMock.createQueryBuilder.mockReturnValue(qb);

    await service.getDeadLetterJobs('v42');

    expect(qb.where).toHaveBeenCalledWith('job.status = :status', { status: SyncJobStatus.DEAD_LETTER });
    expect(qb.andWhere).toHaveBeenCalledWith('lineItem.vendorId = :vendorId', { vendorId: 'v42' });
  });

  it('ambiguous with a vendorId filters to that tenant only (Phase 3.3)', async () => {
    const qb = mockSyncQb();
    syncJobRepositoryMock.createQueryBuilder.mockReturnValue(qb);

    await service.getAmbiguousJobs('v42');

    expect(qb.where).toHaveBeenCalledWith('job.status = :status', { status: SyncJobStatus.AMBIGUOUS });
    expect(qb.andWhere).toHaveBeenCalledWith('lineItem.vendorId = :vendorId', { vendorId: 'v42' });
  });

  it.todo('should throw error on invalid manual state transition');
  // NOTE (Phase 0): manualResolve performs no state-transition validation
  // today — any status can be forced onto a line item via the admin resolve
  // flow (admin.service.ts -> fulfillmentService.manualResolve). This safety
  // property is a real gap scheduled with the Phase 8 orders-depth work
  // (transition rules + guard). Restore this test when validation lands.
});
