"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const fulfillment_service_1 = require("./fulfillment.service");
const typeorm_1 = require("@nestjs/typeorm");
const order_line_item_entity_1 = require("../common/entities/order-line-item.entity");
const vendor_sync_job_entity_1 = require("../common/entities/vendor-sync-job.entity");
const order_entity_1 = require("../common/entities/order.entity");
const vendor_mock_service_1 = require("../integrations/vendor-mock/vendor-mock.service");
const audit_1 = require("../common/audit");
const vendor_mock_dto_1 = require("../integrations/vendor-mock/dto/vendor-mock.dto");
describe('FulfillmentService - Reconciliation', () => {
    let service;
    let syncJobRepositoryMock;
    let lineItemRepositoryMock;
    let vendorMockServiceMock;
    let auditServiceMock;
    beforeEach(async () => {
        syncJobRepositoryMock = {
            find: jest.fn(),
            update: jest.fn(),
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                fulfillment_service_1.FulfillmentService,
                { provide: (0, typeorm_1.getRepositoryToken)(vendor_sync_job_entity_1.VendorSyncJob), useValue: syncJobRepositoryMock },
                { provide: (0, typeorm_1.getRepositoryToken)(order_line_item_entity_1.OrderLineItem), useValue: lineItemRepositoryMock },
                { provide: (0, typeorm_1.getRepositoryToken)(order_entity_1.Order), useValue: {} },
                { provide: vendor_mock_service_1.VendorMockService, useValue: vendorMockServiceMock },
                { provide: audit_1.AuditService, useValue: auditServiceMock },
            ],
        }).compile();
        service = module.get(fulfillment_service_1.FulfillmentService);
    });
    it('should resolve job when vendor confirms', async () => {
        const job = { id: 'job1', correlationId: 'c1', orderLineItem: { id: 'li1', vendorReference: 'ref1', vendorId: 'v1' } };
        syncJobRepositoryMock.find.mockResolvedValue([job]);
        vendorMockServiceMock.queryFulfillmentStatus.mockResolvedValue({ success: true, responseType: vendor_mock_dto_1.VendorResponseType.SUCCESS });
        const result = await service.reconcile(0);
        expect(result.resolved).toBe(1);
        expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', expect.objectContaining({ status: vendor_sync_job_entity_1.SyncJobStatus.COMPLETED }));
        expect(lineItemRepositoryMock.update).toHaveBeenCalledWith('li1', expect.objectContaining({ fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED }));
    });
    it('should fail job when vendor returns FAILURE', async () => {
        const job = { id: 'job1', correlationId: 'c1', orderLineItem: { id: 'li1', vendorReference: 'ref1', vendorId: 'v1' } };
        syncJobRepositoryMock.find.mockResolvedValue([job]);
        vendorMockServiceMock.queryFulfillmentStatus.mockResolvedValue({ success: false, responseType: vendor_mock_dto_1.VendorResponseType.FAILURE, message: 'Reject' });
        const result = await service.reconcile(0);
        expect(result.resolved).toBe(1);
        expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', expect.objectContaining({ status: vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER }));
        expect(lineItemRepositoryMock.update).toHaveBeenCalledWith('li1', expect.objectContaining({ fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.FAILED }));
    });
    it('should mark job as ambiguous when vendor times out', async () => {
        const job = { id: 'job1', correlationId: 'c1', orderLineItem: { id: 'li1', vendorReference: 'ref1', vendorId: 'v1' } };
        syncJobRepositoryMock.find.mockResolvedValue([job]);
        vendorMockServiceMock.queryFulfillmentStatus.mockResolvedValue({ success: false, responseType: vendor_mock_dto_1.VendorResponseType.TIMEOUT, message: 'Timeout' });
        const result = await service.reconcile(0);
        expect(result.stillAmbiguous).toBe(1);
        expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', expect.objectContaining({ status: vendor_sync_job_entity_1.SyncJobStatus.AMBIGUOUS }));
        expect(lineItemRepositoryMock.update).toHaveBeenCalledWith('li1', expect.objectContaining({ fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.AMBIGUOUS }));
    });
    it('should retry job when vendor reference is missing', async () => {
        const job = { id: 'job1', orderLineItem: { id: 'li1', vendorReference: null } };
        syncJobRepositoryMock.find.mockResolvedValue([job]);
        const result = await service.reconcile(0);
        expect(result.resolved).toBe(1);
        expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', { status: vendor_sync_job_entity_1.SyncJobStatus.PENDING });
    });
    it('should resolve job via manual resolution', async () => {
        const lineItem = { id: 'li1', fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.AMBIGUOUS, orderId: 'ord1', syncJob: { id: 'job1' } };
        lineItemRepositoryMock.findOne.mockResolvedValue(lineItem);
        auditServiceMock.logFulfillmentStatusChange = jest.fn();
        service.checkOrderFulfillment = jest.fn();
        await service.manualResolve('li1', { newStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED }, 'c1');
        expect(lineItemRepositoryMock.update).toHaveBeenCalledWith('li1', expect.objectContaining({ fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED }));
        expect(syncJobRepositoryMock.update).toHaveBeenCalledWith('job1', expect.objectContaining({ status: vendor_sync_job_entity_1.SyncJobStatus.COMPLETED }));
    });
    it('should throw error on invalid manual state transition', async () => {
        const lineItem = { id: 'li1', fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED, orderId: 'ord1' };
        lineItemRepositoryMock.findOne.mockResolvedValue(lineItem);
        await expect(service.manualResolve('li1', { newStatus: order_line_item_entity_1.FulfillmentStatus.FAILED }, 'c1'))
            .rejects.toThrow('Invalid state transition');
    });
});
//# sourceMappingURL=fulfillment.service.spec.js.map