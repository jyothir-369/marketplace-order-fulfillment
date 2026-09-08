import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../common/entities/product.entity';
import { DataSource } from 'typeorm';
import { AuditService } from '../common/audit';

describe('InventoryService', () => {
  let service: InventoryService;

  const productRepositoryMock = {
    findOne: jest.fn(),
  };
  const dataSourceMock = {
    transaction: jest.fn((cb) => cb(managerMock)),
  };
  let managerMock: any;

  beforeEach(async () => {
    managerMock = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn(),
        getOne: jest.fn(),
      }),
    };
    dataSourceMock.transaction = jest.fn((cb) => cb(managerMock));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Product), useValue: productRepositoryMock },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: AuditService, useValue: { logInventoryDecrement: jest.fn() } },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateStockAvailability', () => {
    it('returns available=true when every item has sufficient stock', async () => {
      managerMock.createQueryBuilder().getMany.mockResolvedValue([
        { id: 'p1', name: 'Widget', isActive: true, stockCount: 10 },
        { id: 'p2', name: 'Gadget', isActive: true, stockCount: 3 },
      ]);

      const result = await service.validateStockAvailability(
        [
          { productId: 'p1', quantity: 2 },
          { productId: 'p2', quantity: 3 },
        ],
        'corr-1',
      );

      expect(result.available).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        productId: 'p1',
        availableQuantity: 10,
        requestedQuantity: 2,
      });
    });

    it('returns available=false with per-item diffs on oversell', async () => {
      managerMock.createQueryBuilder().getMany.mockResolvedValue([
        { id: 'p1', name: 'Widget', isActive: true, stockCount: 1 },
      ]);

      const result = await service.validateStockAvailability(
        [{ productId: 'p1', quantity: 5 }],
        'corr-1',
      );

      expect(result.available).toBe(false);
      expect(result.items[0].availableQuantity).toBe(1);
      expect(result.items[0].requestedQuantity).toBe(5);
    });

    it('treats inactive products as unavailable', async () => {
      managerMock.createQueryBuilder().getMany.mockResolvedValue([
        { id: 'p1', name: 'Retired', isActive: false, stockCount: 100 },
      ]);

      const result = await service.validateStockAvailability(
        [{ productId: 'p1', quantity: 1 }],
        'corr-1',
      );

      expect(result.available).toBe(false);
      expect(result.items[0].availableQuantity).toBe(0);
    });
  });
});
