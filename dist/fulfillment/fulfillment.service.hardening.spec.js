"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const fulfillment_service_1 = require("./fulfillment.service");
const typeorm_1 = require("@nestjs/typeorm");
const order_entity_1 = require("../common/entities/order.entity");
const order_line_item_entity_1 = require("../common/entities/order-line-item.entity");
const vendor_sync_job_entity_1 = require("../common/entities/vendor-sync-job.entity");
const vendor_mock_service_1 = require("../integrations/vendor-mock/vendor-mock.service");
const audit_1 = require("../common/audit");
describe('FulfillmentService - Hardening', () => {
    let service;
    let orderRepositoryMock;
    beforeEach(async () => {
        orderRepositoryMock = {
            findOne: jest.fn(),
            update: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                fulfillment_service_1.FulfillmentService,
                { provide: (0, typeorm_1.getRepositoryToken)(order_entity_1.Order), useValue: orderRepositoryMock },
                { provide: (0, typeorm_1.getRepositoryToken)(order_line_item_entity_1.OrderLineItem), useValue: {} },
                { provide: (0, typeorm_1.getRepositoryToken)(vendor_sync_job_entity_1.VendorSyncJob), useValue: {} },
                { provide: vendor_mock_service_1.VendorMockService, useValue: {} },
                { provide: audit_1.AuditService, useValue: { logOrderStatusChange: jest.fn() } },
            ],
        }).compile();
        service = module.get(fulfillment_service_1.FulfillmentService);
    });
    it('should not update order status if already cancelled', async () => {
        orderRepositoryMock.findOne.mockResolvedValue({ id: 'ord1', status: order_entity_1.OrderStatus.CANCELLED, lineItems: [] });
        await service.checkOrderFulfillment('ord1', 'c1');
        expect(orderRepositoryMock.update).not.toHaveBeenCalled();
    });
    it('should handle multi-vendor order with mixed states correctly', async () => {
        orderRepositoryMock.findOne.mockResolvedValue({
            id: 'ord1',
            status: order_entity_1.OrderStatus.FULFILLING,
            lineItems: [
                { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED },
                { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.PENDING },
            ],
        });
        await service.checkOrderFulfillment('ord1', 'c1');
        expect(orderRepositoryMock.update).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=fulfillment.service.hardening.spec.js.map