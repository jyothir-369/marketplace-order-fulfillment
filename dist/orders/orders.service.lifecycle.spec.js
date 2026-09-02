"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const orders_service_1 = require("./orders.service");
const typeorm_1 = require("@nestjs/typeorm");
const order_entity_1 = require("../common/entities/order.entity");
const order_line_item_entity_1 = require("../common/entities/order-line-item.entity");
const product_entity_1 = require("../common/entities/product.entity");
const typeorm_2 = require("typeorm");
const inventory_service_1 = require("../inventory/inventory.service");
const audit_1 = require("../common/audit");
const vendor_queue_service_1 = require("../fulfillment/vendor-queue.service");
describe('OrdersService - Lifecycle', () => {
    let service;
    let orderRepositoryMock;
    let lineItemRepositoryMock;
    let dataSourceMock;
    beforeEach(async () => {
        orderRepositoryMock = {
            findOne: jest.fn(),
            update: jest.fn(),
        };
        lineItemRepositoryMock = {
            update: jest.fn(),
        };
        dataSourceMock = {};
        const module = await testing_1.Test.createTestingModule({
            providers: [
                orders_service_1.OrdersService,
                { provide: (0, typeorm_1.getRepositoryToken)(order_entity_1.Order), useValue: orderRepositoryMock },
                { provide: (0, typeorm_1.getRepositoryToken)(order_line_item_entity_1.OrderLineItem), useValue: lineItemRepositoryMock },
                { provide: (0, typeorm_1.getRepositoryToken)(product_entity_1.Product), useValue: {} },
                { provide: typeorm_2.DataSource, useValue: dataSourceMock },
                { provide: inventory_service_1.InventoryService, useValue: { restoreStock: jest.fn() } },
                { provide: audit_1.AuditService, useValue: { logOrderStatusChange: jest.fn() } },
                { provide: vendor_queue_service_1.VendorQueueService, useValue: {} },
            ],
        }).compile();
        service = module.get(orders_service_1.OrdersService);
    });
    it('should prevent cancellation of FULFILLED orders', async () => {
        orderRepositoryMock.findOne.mockResolvedValue({ id: 'ord1', status: order_entity_1.OrderStatus.FULFILLED });
        await expect(service.cancelOrder('ord1', 'c1')).rejects.toThrow('Cannot cancel order in status: fulfilled');
    });
    it('should allow cancellation of PLACED orders', async () => {
        orderRepositoryMock.findOne.mockResolvedValue({
            id: 'ord1',
            status: order_entity_1.OrderStatus.PLACED,
            lineItems: []
        });
        await service.cancelOrder('ord1', 'c1');
        expect(orderRepositoryMock.update).toHaveBeenCalledWith('ord1', { status: order_entity_1.OrderStatus.CANCELLED });
    });
});
//# sourceMappingURL=orders.service.lifecycle.spec.js.map