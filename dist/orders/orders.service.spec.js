"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const orders_service_1 = require("./orders.service");
const typeorm_1 = require("@nestjs/typeorm");
const entities_1 = require("../common/entities");
const typeorm_2 = require("typeorm");
const inventory_service_1 = require("../inventory/inventory.service");
const audit_1 = require("../common/audit");
const vendor_queue_service_1 = require("../fulfillment/vendor-queue.service");
describe('OrdersService', () => {
    let service;
    let vendorQueueService;
    let lineItemRepository;
    beforeEach(async () => {
        lineItemRepository = { update: jest.fn() };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                orders_service_1.OrdersService,
                { provide: (0, typeorm_1.getRepositoryToken)(entities_1.Order), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'order1', lineItems: [] }) } },
                { provide: (0, typeorm_1.getRepositoryToken)(entities_1.OrderLineItem), useValue: lineItemRepository },
                { provide: (0, typeorm_1.getRepositoryToken)(entities_1.Product), useValue: {
                        createQueryBuilder: jest.fn().mockReturnValue({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([{ id: 'p1', vendorId: 'v1', price: 10, stockCount: 10 }]),
                        }),
                    } },
                { provide: typeorm_2.DataSource, useValue: { transaction: jest.fn((cb) => cb({
                            createQueryBuilder: jest.fn().mockReturnValue({
                                setLock: jest.fn().mockReturnThis(),
                                where: jest.fn().mockReturnThis(),
                                getOne: jest.fn().mockResolvedValue({ id: 'p1', stockCount: 10 }),
                                update: jest.fn().mockReturnThis(),
                                set: jest.fn().mockReturnThis(),
                                execute: jest.fn().mockResolvedValue({}),
                            }),
                            create: jest.fn((entity, data) => ({ ...data, id: 'item1' })),
                            save: jest.fn().mockImplementation((entity, data) => Promise.resolve(Array.isArray(data) ? data.map(d => ({ ...d, id: 'item1' })) : ({ ...data, id: 'order1' }))),
                            update: jest.fn(),
                        })) } },
                { provide: inventory_service_1.InventoryService, useValue: {} },
                { provide: audit_1.AuditService, useValue: { logInventoryDecrement: jest.fn(), logOrderCreated: jest.fn() } },
                { provide: vendor_queue_service_1.VendorQueueService, useValue: { addJobToVendorQueue: jest.fn() } },
            ],
        }).compile();
        service = module.get(orders_service_1.OrdersService);
        vendorQueueService = module.get(vendor_queue_service_1.VendorQueueService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should enqueue fulfillment jobs on successful checkout', async () => {
        const dto = { buyerId: 'b1', items: [{ productId: 'p1', quantity: 2 }] };
        await service.checkout(dto, 'corr1');
        expect(vendorQueueService.addJobToVendorQueue).toHaveBeenCalledWith('v1', expect.objectContaining({ orderLineItemId: 'item1' }));
    });
    it('should handle failure in enqueuing fulfillment jobs', async () => {
        vendorQueueService.addJobToVendorQueue = jest.fn().mockRejectedValue(new Error('Queue fail'));
        const dto = { buyerId: 'b1', items: [{ productId: 'p1', quantity: 2 }] };
        await service.checkout(dto, 'corr1');
        expect(lineItemRepository.update).toHaveBeenCalledWith('item1', {
            fulfillmentStatus: entities_1.FulfillmentStatus.FAILED,
            failureReason: 'Failed to enqueue fulfillment job',
        });
    });
});
//# sourceMappingURL=orders.service.spec.js.map