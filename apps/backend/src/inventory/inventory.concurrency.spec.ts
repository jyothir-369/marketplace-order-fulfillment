import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../common/entities/product.entity';
import { DataSource, EntityManager } from 'typeorm';
import { InventoryService } from './inventory.service';
import { AuditService } from '../common/audit';

/**
 * Concurrency & oversell-prevention tests (FR3), Phase 4.4.
 *
 * Tests the REAL implementation: concurrent `decrementStock` calls against the
 * same product serialize through the pessimistic row lock (`SELECT ... FOR
 * UPDATE`, i.e. `setLock('pessimistic_write')`) and must never oversell.
 *
 * A real PostgreSQL row lock is emulated with a promise-chain mutex over the
 * mock `DataSource.transaction`: each transaction callback runs to completion
 * (locked SELECT -> stock check -> UPDATE write-back) before the next begins,
 * and every locked SELECT re-reads the current value written by its
 * predecessor. That is exactly the serialization the row lock provides in
 * production, so the assertions hold for the real code path.
 *
 * NOTE: there is intentionally NO test for an optimistic-lock guard — the
 * previous version of this spec asserted one that production code does not
 * implement. The pessimistic lock alone carries the concurrency guarantee here.
 */

const PRODUCT_ID = '00000000-0000-0000-0000-0000000000aa';

interface MutableStock {
  stockCount: number;
}

/**
 * Fluent mock of the UPDATE query builder. `set` mutates the shared stock and
 * returns itself so the service's chain `.update().set().where().execute()`
 * resolves; `execute` resolves once the stock is already written.
 */
function updateBuilder(stock: MutableStock): any {
  const builder: any = {
    update: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    set: jest.fn().mockImplementation((data: any) => {
      if (typeof data.stockCount === 'number') {
        stock.stockCount = data.stockCount;
      }
      return builder;
    }),
  };
  return builder;
}

/**
 * A mock EntityManager that serializes stock operations against a shared
 * in-memory value. `createQueryBuilder(Product, ...)` is the locked read;
 * `createQueryBuilder()` (no entity arg) is the UPDATE write-back. The read
 * builder records its `setLock` mode on a shared array so tests can assert the
 * lock used by every transaction.
 */
function serializedManager(stock: MutableStock, lockCalls: string[]) {
  const manager: any = {
    createQueryBuilder: jest.fn((entity?: any) => {
      if (entity === Product) {
        return {
          setLock: (mode: string) => {
            lockCalls.push(mode);
            return {
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockImplementation(async () => ({
                id: PRODUCT_ID,
                stockCount: stock.stockCount,
                isActive: true,
                version: 1,
              })),
            };
          },
        };
      }
      // UPDATE ... SET stockCount = :new WHERE id = :id
      return updateBuilder(stock);
    }),
  };
  return manager;
}

describe('InventoryService – Concurrency / Oversell Prevention (FR3)', () => {
  let service: InventoryService;
  let productRepo: { [key: string]: unknown };
  let audit: { logInventoryDecrement: jest.Mock; logInventoryRestore: jest.Mock };

  /** Build the module with a mutex-serialized DataSource.transaction. */
  function buildWithMutex(stock: MutableStock, lockCalls: string[] = []) {
    const manager = serializedManager(stock, lockCalls);
    let chain: Promise<unknown> = Promise.resolve();

    const dataSource = {
      transaction: jest.fn((cb: (m: EntityManager) => Promise<unknown>) => {
        const run = chain.then(() => cb(manager));
        chain = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      }),
    };

    return new Promise<{ module: TestingModule; transaction: jest.Mock }>(
      (resolve) => {
        void Test.createTestingModule({
          providers: [
            InventoryService,
            { provide: getRepositoryToken(Product), useValue: productRepo },
            { provide: DataSource, useValue: dataSource },
            { provide: AuditService, useValue: audit },
          ],
        })
          .compile()
          .then((m) => resolve({ module: m, transaction: dataSource.transaction }));
      },
    );
  }

  beforeEach(async () => {
    productRepo = {};
    audit = {
      logInventoryDecrement: jest.fn().mockResolvedValue(undefined),
      logInventoryRestore: jest.fn().mockResolvedValue(undefined),
    };
  });

  // -------------------------------------------------------------------------
  // Parallel decrement race — pessimistic lock must never oversell
  // -------------------------------------------------------------------------

  it('never oversells: N parallel 1-unit decrements against limited stock', async () => {
    const stock: MutableStock = { stockCount: 3 };
    const { module } = await buildWithMutex(stock);
    service = module.get<InventoryService>(InventoryService);

    const N = 8; // 8 shoppers racing for 3 units
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        service.decrementStock({ productId: PRODUCT_ID, quantity: 1 }, 'corr-' + i),
      ),
    );

    const successes = results.filter((r) => r.success);
    const rejections = results.filter((r) => !r.success);

    // Exactly 3 succeed (3 units), the other 5 are rejected with insufficient stock.
    expect(successes).toHaveLength(3);
    expect(rejections).toHaveLength(N - 3);
    for (const r of rejections) {
      expect(r.message).toMatch(/insufficient/i);
    }
    // Total decremented never exceeds the original stock.
    const totalDecremented = successes.reduce((sum, r) => sum + (r.previousStock - r.newStock), 0);
    expect(totalDecremented).toBeLessThanOrEqual(3);
    // Running tally stayed consistent: stock never went negative.
    expect(successes.every((r) => r.newStock >= 0)).toBe(true);
    // Shared stock reflects exactly the successful decrements.
    expect(stock.stockCount).toBe(3 - totalDecremented);
  });

  it('handles mixed quantities racing for the same product', async () => {
    const stock: MutableStock = { stockCount: 5 };
    const { module } = await buildWithMutex(stock);
    service = module.get<InventoryService>(InventoryService);

    const quantities = [3, 2, 2, 4, 1]; // sum 12 against 5 units
    const results = await Promise.all(
      quantities.map((q, i) =>
        service.decrementStock({ productId: PRODUCT_ID, quantity: q }, 'corr-m-' + i),
      ),
    );

    const successes = results.filter((r) => r.success);
    const totalDecremented = successes.reduce((sum, r) => sum + (r.previousStock - r.newStock), 0);

    expect(totalDecremented).toBeLessThanOrEqual(5);
    // Every request resolved — none hung or threw.
    expect(results).toHaveLength(quantities.length);
    // A successful 3 and a successful 2 can coexist; four units was never
    // available while stock was held by earlier serialized consumers.
    for (const r of successes) {
      expect(r.previousStock).toBeGreaterThanOrEqual(r.requestedQuantity);
    }
    expect(stock.stockCount).toBe(5 - totalDecremented);
  });

  it('uses SELECT ... FOR UPDATE (pessimistic_write) as the primary guard', async () => {
    const stock: MutableStock = { stockCount: 2 };
    const lockCalls: string[] = [];
    const { module } = await buildWithMutex(stock, lockCalls);
    service = module.get<InventoryService>(InventoryService);

    await Promise.all([
      service.decrementStock({ productId: PRODUCT_ID, quantity: 1 }, 'corr-l1'),
      service.decrementStock({ productId: PRODUCT_ID, quantity: 1 }, 'corr-l2'),
    ]);

    // Every locked SELECT resolved to pessimistic_write — this is what serializes
    // the transactions and prevents overselling.
    expect(lockCalls.length).toBeGreaterThanOrEqual(2);
    expect(lockCalls.every((mode) => mode === 'pessimistic_write')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Single-call behavior against the real branches (no concurrency)
  // -------------------------------------------------------------------------

  it('returns success and writes back the reduced stock', async () => {
    const stock: MutableStock = { stockCount: 5 };
    const { module } = await buildWithMutex(stock);
    service = module.get<InventoryService>(InventoryService);

    const result = await service.decrementStock({ productId: PRODUCT_ID, quantity: 2 }, 'corr-ok');

    expect(result.success).toBe(true);
    expect(result.previousStock).toBe(5);
    expect(result.newStock).toBe(3);
    expect(stock.stockCount).toBe(3);
    expect(audit.logInventoryDecrement).toHaveBeenCalledWith(
      'corr-ok',
      PRODUCT_ID,
      5,
      3,
      2,
      undefined,
    );
  });

  it('rejects with insufficient-stock message without throwing when stock runs out', async () => {
    const stock: MutableStock = { stockCount: 1 };
    const { module } = await buildWithMutex(stock);
    service = module.get<InventoryService>(InventoryService);

    const result = await service.decrementStock({ productId: PRODUCT_ID, quantity: 2 }, 'corr-short');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/insufficient/i);
    expect(result.newStock).toBe(1); // untouched
    expect(stock.stockCount).toBe(1); // nothing written
    expect(audit.logInventoryDecrement).not.toHaveBeenCalled();
  });

  it('inactive product: returns success=false without throwing', async () => {
    // Build a manager whose locked SELECT returns an inactive product.
    const dataSource = {
      transaction: (cb: any) =>
        cb({
          createQueryBuilder: jest.fn((entity?: any) => {
            if (entity === Product) {
              return {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({
                  id: PRODUCT_ID,
                  stockCount: 10,
                  isActive: false,
                  version: 1,
                }),
              };
            }
            return { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis() };
          }),
        }),
    };

    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    const result = await service.decrementStock({ productId: PRODUCT_ID, quantity: 1 }, 'corr-inactive');

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not active/i);
  });

  it('throws BadRequestException when the product does not exist', async () => {
    const dataSource = {
      transaction: (cb: any) =>
        cb({
          createQueryBuilder: jest.fn(() => ({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(undefined),
          })),
        }),
    };

    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    await expect(
      service.decrementStock({ productId: '00000000-0000-0000-0000-00000000dead', quantity: 1 }, 'corr-missing'),
    ).rejects.toThrow(BadRequestException);
  });

  // -------------------------------------------------------------------------
  // restoreStock — cancellation path
  // -------------------------------------------------------------------------

  it('restoreStock increments stock inside a pessimistic-lock transaction', async () => {
    const stock: MutableStock = { stockCount: 4 };
    const { module } = await buildWithMutex(stock);
    service = module.get<InventoryService>(InventoryService);

    const result = await service.restoreStock(PRODUCT_ID, 1, 'corr-restore', 'Order cancellation');

    expect(result.success).toBe(true);
    expect(result.previousStock).toBe(4);
    expect(result.newStock).toBe(5);
    expect(stock.stockCount).toBe(5);
  });
});