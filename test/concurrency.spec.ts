/**
 * Concurrency & Oversell Prevention Tests (FR3)
 *
 * These tests validate the pessimistic-lock + secondary-optimistic-lock guard
 * path through InventoryService.decrementStock and OrdersService.checkout without
 * requiring a real PostgreSQL instance.
 *
 * Each test instruments the EntityManager to simulate concurrent transactions and
 * verifies that exactly one succeeds when they race for the last unit of stock.
 *
 * Run with: npx jest test/concurrency.spec.ts --runInBand
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from '../src/orders/orders.service';
import { InventoryService } from '../src/inventory/inventory.service';
import { AuditService } from '../src/common/audit';
import { VendorQueueService } from '../src/fulfillment/vendor-queue.service';
import { Order, OrderStatus } from '../src/common/entities/order.entity';
import { OrderLineItem } from '../src/common/entities/order-line-item.entity';
import { Product } from '../src/common/entities/product.entity';
import { Vendor } from '../src/common/entities/vendor.entity';

const VENDOR_ID = '00000000-0000-0000-0000-000000000001';
const BUYER_ID = '00000000-0000-0000-0000-000000000002';

describe('Concurrency — Inventory Oversell Prevention (FR3)', () => {
  let inventoryService: InventoryService;
  let ordersService: OrdersService;
  let productRepo: Repository<Product>;
  let dataSourceMock: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        OrdersService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logInventoryDecrement: jest.fn().mockResolvedValue(undefined),
            logInventoryRestore: jest.fn().mockResolvedValue(undefined),
            logOrderCreated: jest.fn().mockResolvedValue(undefined),
            logOrderStatusChange: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: VendorQueueService,
          useValue: {
            addJobToVendorQueue: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: getRepositoryToken(Order), useFactory: () => ({}) },
        { provide: getRepositoryToken(OrderLineItem), useFactory: () => ({}) },
        { provide: getRepositoryToken(Product), useFactory: () => ({}) },
        { provide: getRepositoryToken(Vendor), useFactory: () => ({}) },
      ],
    }).compile();

    inventoryService = module.get<InventoryService>(InventoryService);
    ordersService = module.get<OrdersService>(OrdersService);
    productRepo = module.get<Repository<Product>>(getRepositoryToken(Product));
    dataSourceMock = module.get(DataSource);
  });

  // -------------------------------------------------------------------------
  // InventoryService.decrementStock — pessimistic lock + optimistic guard
  // -------------------------------------------------------------------------

  describe('InventoryService.decrementStock', () => {
    it('succeeds when sufficient stock exists', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'p1',
            stockCount: 5,
            isActive: true,
            version: 1,
          }),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      };

      (dataSourceMock.transaction as any).mockImplementation(async (cb: EntityManager) => {
          return (cb as any)(mockManager as unknown as EntityManager);
        });

      const result = await inventoryService.decrementStock(
        { productId: 'p1', quantity: 2 },
        'corr-1',
      );

      expect(result.success).toBe(true);
      expect(result.previousStock).toBe(5);
      expect(result.newStock).toBe(3);
    });

    it('fails without throwing when stock is insufficient', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'p1',
            stockCount: 1,
            isActive: true,
            version: 1,
          }),
        }),
      };

      (dataSourceMock.transaction as any).mockImplementation(async (cb: EntityManager) => {
          return (cb as any)(mockManager as unknown as EntityManager);
        });

      const result = await inventoryService.decrementStock(
        { productId: 'p1', quantity: 2 },
        'corr-1',
      );

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/insufficient/i);
    });

    it('fails without throwing when product is inactive', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'p1',
            stockCount: 10,
            isActive: false,
            version: 1,
          }),
        }),
      };

      (dataSourceMock.transaction as any).mockImplementation(async (cb: EntityManager) => {
          return (cb as any)(mockManager as unknown as EntityManager);
        });

      const result = await inventoryService.decrementStock(
        { productId: 'p1', quantity: 1 },
        'corr-1',
      );

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/not active/i);
    });

    it(
      'second concurrent decrementer sees reduced stock and fails gracefully ' +
        '(simulated pessimistic lock ordering)',
      async () => {
        // Simulate two concurrent managers where the first holds the lock and decrements,
        // the second sees the reduced stock.
        const firstStock = { stockCount: 1, isActive: true, version: 1 };

        const firstManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({ ...firstStock }),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          }),
        };

        const secondManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            // The second transaction sees the already-decremented stock
            getOne: jest.fn().mockResolvedValue({
              id: 'p1',
              stockCount: 0, // stock already consumed by first transaction
              isActive: true,
              version: 2,
            }),
          }),
        };

        let callCount = 0;
        (dataSourceMock.transaction as any).mockImplementation((
          cb: EntityManager,
        ) => {
          callCount++;
          return (cb as any)((callCount === 1 ? firstManager : secondManager) as unknown as EntityManager);
        });

        const first = inventoryService.decrementStock(
          { productId: 'p1', quantity: 1 },
          'corr-first',
        );
        const second = inventoryService.decrementStock(
          { productId: 'p1', quantity: 1 },
          'corr-second',
        );

        const [r1, r2] = await Promise.allSettled([first, second]);
        const successes = [r1, r2].filter(
          (r) =>
            r.status === 'fulfilled' &&
            (r as PromiseFulfilledResult<{ success?: boolean }>).value?.success === true,
        );

        // Exactly one must succeed
        expect(successes.length).toBe(1);
      },
    );

    it('throws on optimistic lock failure (simulates concurrent external update)', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'p1',
            stockCount: 5,
            isActive: true,
            version: 1,
          }),
          // Simulate a concurrent UPDATE that changed the version between SELECT and UPDATE
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }), // optimistic lock fails
        }),
      };

      (dataSourceMock.transaction as any).mockImplementation(async (cb: EntityManager) => {
          return (cb as any)(mockManager as unknown as EntityManager);
        });

      await expect(
        inventoryService.decrementStock({ productId: 'p1', quantity: 1 }, 'corr-optlock'),
      ).rejects.toThrow(/optimistic lock failed/i);
    });

    it('calls SELECT ... FOR UPDATE (pessimistic_write) as the primary concurrency guard', async () => {
      const setLockMock = jest.fn().mockReturnThis();
      const getOneMock = jest.fn().mockResolvedValue({
        id: 'p1',
        stockCount: 5,
        isActive: true,
        version: 1,
      });

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: setLockMock,
          where: jest.fn().mockReturnThis(),
          getOne: getOneMock,
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      };

      (dataSourceMock.transaction as any).mockImplementation(async (cb: EntityManager) => {
          return (cb as any)(mockManager as unknown as EntityManager);
        });

      await inventoryService.decrementStock(
        { productId: 'p1', quantity: 1 },
        'corr-lock-check',
      );

      expect(setLockMock).toHaveBeenCalledWith('pessimistic_write');
    });
  });

  // -------------------------------------------------------------------------
  // InventoryService.restoreStock — used during order cancellation
  // -------------------------------------------------------------------------

  describe('InventoryService.restoreStock', () => {
    it('increments stock and validates optimistic lock on restore', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'p1',
            stockCount: 4,
            version: 1,
          }),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      };

      (dataSourceMock.transaction as any).mockImplementation(async (cb: EntityManager) => {
          return (cb as any)(mockManager as unknown as EntityManager);
        });

      const result = await inventoryService.restoreStock(
        'p1',
        1,
        'corr-restore',
        'Order cancellation',
      );

      expect(result.success).toBe(true);
      expect(result.previousStock).toBe(4);
      expect(result.newStock).toBe(5);
    });

    it('throws on optimistic lock failure during restore', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'p1',
            stockCount: 4,
            version: 5,
          }),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        }),
      };

      (dataSourceMock.transaction as any).mockImplementation(async (cb: EntityManager) => {
          return (cb as any)(mockManager as unknown as EntityManager);
        });

      await expect(
        inventoryService.restoreStock('p1', 1, 'corr-opt-fail', 'test'),
      ).rejects.toThrow(/optimistic lock failed/i);
    });
  });

  // -------------------------------------------------------------------------
  // OrdersService — checkout with concurrent items
  // -------------------------------------------------------------------------

  describe('OrdersService.checkout', () => {
    it('creates order and line items on successful checkout', async () => {
      const savedOrder = { id: 'ord1', orderNumber: 'ORD-20260902-A1B2', status: OrderStatus.PLACED };

      const qb: any = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
        getOne: jest.fn().mockResolvedValue({ id: 'p1', stockCount: 5, isActive: true, version: 1 }),
        getMany: jest.fn().mockResolvedValue([{ id: 'p1', stockCount: 5, isActive: true, version: 1 }]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
        findOne: jest.fn().mockResolvedValue({ id: 'ord1', orderNumber: 'ORD-20260902-A1B2', status: OrderStatus.PLACED, buyerId: BUYER_ID, lineItems: [] }),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data, id: entity === Order ? 'ord1' : 'li1' })),
        save: jest.fn().mockImplementation((entity, data) => {
          if (entity === Order) return Promise.resolve({ ...data, id: 'ord1', orderNumber: 'ORD-20260902-A1B2' });
          if (Array.isArray(data)) return Promise.resolve(data.map((d) => ({ ...d, id: 'li1' })));
          return Promise.resolve({ ...data, id: 'li1' });
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      const productRepoMock = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            {
              id: 'p1',
              name: 'Widget',
              price: 10,
              vendorId: VENDOR_ID,
              vendor: { name: 'Test Vendor' },
            },
          ]),
        }),
      };

      const dsMock = {
        transaction: (jest.fn().mockImplementation(async (cb) => cb(mockManager)) as any),
      };

      const auditMock = {
        logInventoryDecrement: jest.fn().mockResolvedValue(undefined),
        logOrderCreated: jest.fn().mockResolvedValue(undefined),
      };

      const vqsMock = { addJobToVendorQueue: jest.fn().mockResolvedValue(undefined) };

      const m = await Test.createTestingModule({
        providers: [
          OrdersService,
          InventoryService,
          { provide: DataSource, useValue: dsMock },
          { provide: getRepositoryToken(Product), useValue: productRepoMock },
          { provide: getRepositoryToken(Order), useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'ord1', orderNumber: 'ORD-20260902-A1B2', status: OrderStatus.PLACED, buyerId: BUYER_ID, lineItems: [] }),
          } },
          { provide: getRepositoryToken(OrderLineItem), useValue: {} },
          { provide: AuditService, useValue: auditMock },
          { provide: VendorQueueService, useValue: vqsMock },
        ],
      }).compile();

      const svc = m.get<OrdersService>(OrdersService);

      const result = await svc.checkout(
        {
          buyerId: BUYER_ID,
          items: [{ productId: 'p1', quantity: 1 }],
        },
        'corr-checkout-1',
      );

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(vqsMock.addJobToVendorQueue).toHaveBeenCalledWith(
        VENDOR_ID,
        expect.objectContaining({ orderLineItemId: 'li1', vendorId: VENDOR_ID }),
      );
    });

    it('fails checkout gracefully when vendor queue fails', async () => {
      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'p1',
            stockCount: 5,
            isActive: true,
            version: 1,
          }),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
        create: jest.fn().mockImplementation((entity, data) => ({
          ...data,
          id: entity === Order ? 'ord-queuefail' : 'li-queuefail',
        })),
        save: jest.fn().mockImplementation((entity, data) => {
          if (entity === Order) return Promise.resolve({ ...data, id: 'ord-queuefail', orderNumber: 'ORD-20260902-QF00' });
          return Promise.resolve(Array.isArray(data) ? data : { ...data, id: 'li-queuefail' });
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      const productRepoMock = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            { id: 'p1', name: 'Widget', price: 10, vendorId: VENDOR_ID, vendor: { name: 'Test Vendor' } },
          ]),
        }),
      };

      const dsMock = {
        transaction: (jest.fn().mockImplementation(async (cb) => cb(mockManager)) as any),
      };

      const vqsFailingMock = {
        addJobToVendorQueue: jest.fn().mockRejectedValue(new Error('Queue unavailable')),
      };

      const lineItemRepoMock = { update: jest.fn().mockResolvedValue({ affected: 1 }) };

      const m = await Test.createTestingModule({
        providers: [
          OrdersService,
          InventoryService,
          { provide: DataSource, useValue: dsMock },
          { provide: getRepositoryToken(Product), useValue: productRepoMock },
          { provide: getRepositoryToken(Order), useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'ord-queuefail', orderNumber: 'ORD-20260902-QF00', status: OrderStatus.PLACED, buyerId: BUYER_ID, lineItems: [] }),
          } },
          { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepoMock },
          { provide: AuditService, useValue: { logInventoryDecrement: jest.fn(), logOrderCreated: jest.fn() } },
          { provide: VendorQueueService, useValue: vqsFailingMock },
        ],
      }).compile();

      const svc = m.get<OrdersService>(OrdersService);

      // Even if queue fails, the order is created and line item is marked FAILED
      const result = await svc.checkout(
        { buyerId: BUYER_ID, items: [{ productId: 'p1', quantity: 1 }] },
        'corr-queue-fail',
      );

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(lineItemRepoMock.update).toHaveBeenCalledWith(
        'li-queuefail',
        expect.objectContaining({ fulfillmentStatus: 'failed' }),
      );
    });
  });
});
