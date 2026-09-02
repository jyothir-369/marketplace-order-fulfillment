"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const admin_service_1 = require("./admin.service");
const typeorm_1 = require("@nestjs/typeorm");
const order_entity_1 = require("../common/entities/order.entity");
const order_line_item_entity_1 = require("../common/entities/order-line-item.entity");
const vendor_sync_job_entity_1 = require("../common/entities/vendor-sync-job.entity");
const orders_service_1 = require("../orders/orders.service");
const fulfillment_service_1 = require("../fulfillment/fulfillment.service");
const audit_1 = require("../common/audit");
describe('AdminService', () => {
    let service;
    let orderRepositoryMock;
    let lineItemRepositoryMock;
    let syncJobRepositoryMock;
    beforeEach(async () => {
        orderRepositoryMock = {
            createQueryBuilder: jest.fn(() => ({
                andWhere: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(0),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            })),
        };
        lineItemRepositoryMock = {
            createQueryBuilder: jest.fn(),
        };
        syncJobRepositoryMock = {
            count: jest.fn().mockResolvedValue(0),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                admin_service_1.AdminService,
                { provide: (0, typeorm_1.getRepositoryToken)(order_entity_1.Order), useValue: orderRepositoryMock },
                { provide: (0, typeorm_1.getRepositoryToken)(order_line_item_entity_1.OrderLineItem), useValue: lineItemRepositoryMock },
                { provide: (0, typeorm_1.getRepositoryToken)(vendor_sync_job_entity_1.VendorSyncJob), useValue: syncJobRepositoryMock },
                { provide: orders_service_1.OrdersService, useValue: {} },
                { provide: fulfillment_service_1.FulfillmentService, useValue: {} },
                { provide: audit_1.AuditService, useValue: {} },
            ],
        }).compile();
        service = module.get(admin_service_1.AdminService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should return empty list when no orders found', async () => {
        const result = await service.getOrders({}, 'c1');
        expect(result.total).toBe(0);
        expect(result.orders).toEqual([]);
    });
});
//# sourceMappingURL=admin.service.spec.js.map