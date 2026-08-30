"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const inventory_service_1 = require("./inventory.service");
const product_entity_1 = require("../common/entities/product.entity");
describe('InventoryService', () => {
    let service;
    let productRepository;
    let dataSource;
    const mockProduct = {
        id: 'test-product-id',
        name: 'Test Product',
        stockCount: 10,
        isActive: true,
    };
    const mockQueryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        update: jest.fn().mockReturnThis(),
        execute: jest.fn(),
    };
    const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                inventory_service_1.InventoryService,
                {
                    provide: (0, typeorm_1.getRepositoryToken)(product_entity_1.Product),
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: typeorm_2.DataSource,
                    useValue: {
                        transaction: jest.fn((cb) => cb(mockManager)),
                    },
                },
            ],
        }).compile();
        service = module.get(inventory_service_1.InventoryService);
        productRepository = module.get((0, typeorm_1.getRepositoryToken)(product_entity_1.Product));
        dataSource = module.get(typeorm_2.DataSource);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('decrementStock', () => {
        it('should successfully decrement stock when sufficient', async () => {
            mockQueryBuilder.getOne.mockResolvedValue({ ...mockProduct, stockCount: 10 });
            const result = await service.decrementStock({ productId: 'test-product-id', quantity: 5 }, 'test-correlation-id');
            expect(result.success).toBe(true);
            expect(result.previousStock).toBe(10);
            expect(result.newStock).toBe(5);
            expect(result.requestedQuantity).toBe(5);
        });
        it('should fail when stock is insufficient', async () => {
            mockQueryBuilder.getOne.mockResolvedValue({ ...mockProduct, stockCount: 3 });
            const result = await service.decrementStock({ productId: 'test-product-id', quantity: 5 }, 'test-correlation-id');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Insufficient stock');
        });
        it('should fail when product is inactive', async () => {
            mockQueryBuilder.getOne.mockResolvedValue({ ...mockProduct, isActive: false });
            const result = await service.decrementStock({ productId: 'test-product-id', quantity: 5 }, 'test-correlation-id');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Product is not active');
        });
        it('should fail when product does not exist', async () => {
            mockQueryBuilder.getOne.mockResolvedValue(null);
            await expect(service.decrementStock({ productId: 'non-existent-id', quantity: 5 }, 'test-correlation-id')).rejects.toThrow('Product non-existent-id not found');
        });
    });
    describe('restoreStock', () => {
        it('should restore stock correctly', async () => {
            mockQueryBuilder.getOne.mockResolvedValue({ ...mockProduct, stockCount: 5 });
            const result = await service.restoreStock('test-product-id', 3, 'test-correlation-id');
            expect(result.success).toBe(true);
            expect(result.previousStock).toBe(5);
            expect(result.newStock).toBe(8);
        });
    });
});
//# sourceMappingURL=inventory.service.spec.js.map