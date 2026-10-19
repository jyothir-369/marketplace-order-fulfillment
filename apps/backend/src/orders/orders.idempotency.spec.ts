import { OrdersService } from './orders.service';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { DataSource } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../common/audit';
import { PaymentsService } from '../payments/payments.service';

describe('Checkout idempotency — isolated unit tests', () => {
  const buyerA = '11111111-1111-4111-8111-111111111111';
  const buyerB = '22222222-2222-4222-8222-222222222222';
  const key = 'checkout-key-001';

  let service: OrdersService;
  let orderRepo: any;
  let productRepo: any;
  let manager: any;
  let payments: any;
  let audit: any;
  let dataSource: any;
  let lockedProduct: any;
  let existingOrder: any;

  const makeOrder = (overrides: Record<string, unknown> = {}) => ({
    id: 'order-existing',
    buyerId: buyerA,
    buyerUserId: null,
    status: OrderStatus.PLACED,
    orderNumber: 'ORD-20261016-000001',
    totalAmount: 20,
    correlationId: 'corr-existing',
    shippingAddress: 'Test address',
    idempotencyKey: key,
    idempotencyPayloadHash:
      buyerA + '|p1:2|Test address|token-test|' + key,
    createdAt: new Date(),
    updatedAt: new Date(),
    lineItems: [],
    ...overrides,
  });

  const makeDto = (overrides: Record<string, unknown> = {}) => ({
    buyerId: buyerA,
    items: [{ productId: 'p1', quantity: 2 }],
    shippingAddress: 'Test address',
    paymentMethodToken: 'token-test',
    idempotencyKey: key,
    ...overrides,
  });

  beforeEach(() => {
    existingOrder = makeOrder();
    lockedProduct = {
      id: 'p1',
      name: 'Test product',
      vendorId: 'vendor-1',
      price: 10,
      stockCount: 10,
    };

    orderRepo = {
      findOne: jest.fn().mockImplementation(async () => existingOrder),
    };

    productRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([lockedProduct]),
      }),
    };

    manager = {
      query: jest.fn().mockImplementation(async (sql: string) => {
        if (sql.includes('nextval')) return [{ seq: 2 }];
        return [];
      }),
      createQueryBuilder: jest.fn().mockImplementation((entity?: any) => {
        if (entity === Order) {
          return {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockImplementation(async () => {
              const whereCalls = lookupBuilder.where.mock.calls;
              const andWhereCalls = lookupBuilder.andWhere.mock.calls;
              const buyerCondition = whereCalls[0]?.[1]?.buyerId;
              const keyCondition = andWhereCalls[0]?.[1]?.key;
              if (
                existingOrder &&
                existingOrder.buyerId === buyerCondition &&
                existingOrder.idempotencyKey === keyCondition
              ) {
                return existingOrder;
              }
              return null;
            }),
          };
        }

        if (entity === Product) {
          return {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({ ...lockedProduct }),
          };
        }

        return {
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        };
      }),
      create: jest.fn((_entity: any, value: any) => ({ ...value })),
      save: jest.fn().mockImplementation(async (entity: any, value: any) => {
        if (Array.isArray(value)) {
          return value.map((item, index) => ({
            ...item,
            id: 'line-' + index,
          }));
        }
        return { ...value, id: 'order-new' };
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      getRepository: jest.fn().mockImplementation(() => ({
        findOne: jest.fn().mockImplementation(async () => existingOrder),
      })),
    };

    // Capture the Order query builder so its predicates can be checked.
    const originalCreateQueryBuilder = manager.createQueryBuilder;
    let lookupBuilder: any;
    manager.createQueryBuilder = jest.fn().mockImplementation((entity?: any) => {
      const builder = originalCreateQueryBuilder(entity);
      if (entity === Order) lookupBuilder = builder;
      return builder;
    });

    dataSource = {
      transaction: jest.fn(async (callback: (m: any) => Promise<any>) =>
        callback(manager),
      ),
    };

    payments = {
      authorize: jest.fn().mockResolvedValue({
        success: true,
        status: 'authorized',
        providerReference: 'PAY-TEST',
        message: 'Approved',
      }),
      recordCapture: jest.fn().mockResolvedValue({ id: 'payment-1' }),
      refund: jest.fn(),
    };

    audit = {
      logInventoryDecrement: jest.fn().mockResolvedValue(undefined),
      logOrderCreated: jest.fn().mockResolvedValue(undefined),
      logPaymentFailed: jest.fn().mockResolvedValue(undefined),
    };

    service = new OrdersService(
      orderRepo,
      {} as any,
      productRepo,
      dataSource as DataSource,
      {} as InventoryService,
      audit as AuditService,
      payments as PaymentsService,
    );
  });

  it('replays a matching buyer, key and payload without authorizing or capturing again', async () => {
    const result = await service.checkout(makeDto() as any, 'corr-replay');

    expect(result.success).toBe(true);
    expect(result.order?.id).toBe('order-existing');
    expect(result.message).toMatch(/replayed/i);
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['checkout_' + buyerA + '_' + key],
    );
    expect(payments.authorize).not.toHaveBeenCalled();
    expect(payments.recordCapture).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
    expect(audit.logInventoryDecrement).not.toHaveBeenCalled();
  });

  it('returns HTTP 409 when the same buyer reuses a key with a different payload', async () => {
    existingOrder = makeOrder();

    await expect(
      service.checkout(
        makeDto({ items: [{ productId: 'p1', quantity: 3 }] }) as any,
        'corr-conflict',
      ),
    ).rejects.toMatchObject({ status: 409 });

    expect(payments.authorize).not.toHaveBeenCalled();
    expect(payments.recordCapture).not.toHaveBeenCalled();
    expect(audit.logInventoryDecrement).not.toHaveBeenCalled();
  });

  it('scopes the idempotency lock and lookup to the buyer', async () => {
    existingOrder = makeOrder({ buyerId: buyerA });

    const result = await service.checkout(
      makeDto({ buyerId: buyerB }) as any,
      'corr-other-buyer',
    );

    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['checkout_' + buyerB + '_' + key],
    );
    expect(payments.authorize).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.order?.id).toBe('order-existing');
  });

  it('rejects checkout when recording payment capture fails', async () => {
    existingOrder = null;
    manager.getRepository = jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        id: 'order-new',
        buyerId: buyerA,
        status: OrderStatus.PLACED,
        totalAmount: 20,
        correlationId: 'corr-capture-failure',
        shippingAddress: 'Test address',
        lineItems: [],
      }),
    });
    payments.recordCapture.mockRejectedValueOnce(
      new Error('Simulated capture persistence failure'),
    );

    await expect(
      service.checkout(
        makeDto({ idempotencyKey: undefined }) as any,
        'corr-capture-failure',
      ),
    ).rejects.toThrow('Simulated capture persistence failure');

    expect(payments.authorize).toHaveBeenCalledTimes(1);
    expect(payments.recordCapture).toHaveBeenCalledTimes(1);
    expect(audit.logOrderCreated).not.toHaveBeenCalled();
  });
});
