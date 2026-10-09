import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FulfillmentService } from './fulfillment.service';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { VendorSyncJob, SyncJobStatus } from '../common/entities/vendor-sync-job.entity';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';
import { VendorMockService } from '../integrations/vendor-mock/vendor-mock.service';
import { AuditService } from '../common/audit';

describe('Fulfillment payment guard', () => {
  let service: FulfillmentService;
  let lineItems: any;
  let syncJobs: any;
  let payments: any;
  let audit: any;

  const dto = {
    orderLineItemId: 'line-1',
    orderId: 'order-1',
    vendorId: 'vendor-1',
    correlationId: 'corr-1',
  };

  beforeEach(async () => {
    lineItems = {
      findOne: jest.fn().mockResolvedValue({
        id: 'line-1',
        orderId: 'order-1',
        vendorId: 'vendor-1',
      }),
      update: jest.fn(),
    };

    syncJobs = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: 'job-1' })),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    payments = {
      findOne: jest.fn().mockResolvedValue({
        id: 'payment-1',
        orderId: 'order-1',
        status: PaymentStatus.PENDING,
      }),
    };

    audit = {
      logSyncJobCreated: jest.fn(),
      logSyncJobStatusChange: jest.fn(),
      logFulfillmentStatusChange: jest.fn(),
      logSyncJobCompleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FulfillmentService,
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItems },
        { provide: getRepositoryToken(VendorSyncJob), useValue: syncJobs },
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(PaymentAuthorization), useValue: payments },
        { provide: VendorMockService, useValue: {} },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<FulfillmentService>(FulfillmentService);
  });

  it('blocks sync-job creation while payment is pending', async () => {
    await expect(service.createSyncJob(dto)).rejects.toBeInstanceOf(ConflictException);

    expect(syncJobs.save).not.toHaveBeenCalled();
    expect(audit.logSyncJobCreated).not.toHaveBeenCalled();
  });

  it('returns immediately for completed jobs without rechecking payment', async () => {
    syncJobs.findOne.mockResolvedValue({
      id: 'job-completed',
      status: SyncJobStatus.COMPLETED,
      attempts: 1,
      orderLineItemId: 'line-1',
      orderLineItem: { id: 'line-1', orderId: 'order-1', vendorId: 'vendor-1' },
    });

    await expect(
      service.processSyncJob('job-completed', 'corr-1'),
    ).resolves.toBeUndefined();

    expect(payments.findOne).not.toHaveBeenCalled();
    expect(syncJobs.update).not.toHaveBeenCalled();
    expect(lineItems.update).not.toHaveBeenCalled();
  });
  it('blocks processing before job or line-item state is mutated', async () => {
    syncJobs.findOne.mockResolvedValue({
      id: 'job-1',
      status: SyncJobStatus.PENDING,
      attempts: 0,
      orderLineItemId: 'line-1',
      orderLineItem: {
        id: 'line-1',
        orderId: 'order-1',
        vendorId: 'vendor-1',
      },
    });

    await expect(
      service.processSyncJob('job-1', 'corr-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(syncJobs.update).not.toHaveBeenCalled();
    expect(lineItems.update).not.toHaveBeenCalled();
  });

  it('preserves legacy behavior when no payment record exists', async () => {
    payments.findOne.mockResolvedValue(null);

    await expect(service.createSyncJob(dto)).resolves.toMatchObject({
      id: 'job-1',
      orderLineItemId: 'line-1',
    });

    expect(syncJobs.save).toHaveBeenCalledTimes(1);
  });

  it('allows job creation when the latest payment is captured', async () => {
    payments.findOne.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.CAPTURED,
    });

    await expect(service.createSyncJob(dto)).resolves.toMatchObject({
      id: 'job-1',
      orderLineItemId: 'line-1',
    });
  });
});