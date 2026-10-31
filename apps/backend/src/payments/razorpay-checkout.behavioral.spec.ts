import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RazorpayInitiationService } from './razorpay-initiation.service';
import { RazorpayProviderService } from './razorpay-provider.service';
import { AuditService } from '../common/audit';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';

describe('RazorpayInitiationService — behavioral tests', () => {
  let service: RazorpayInitiationService;
  let provider: {
    createOrder: jest.Mock;
    getPublicKeyId: jest.Mock;
  };
  let audit: {
    logInventoryDecrement: jest.Mock;
    logOrderCreated: jest.Mock;
  };
  let manager: any;
  let dataSource: { transaction: jest.Mock };
  let products: Map<string, any>;

  const buyerId = 'buyer-test-1';
  const address = '123 Test Street, Ludhiana';
  const correlationId = 'corr-test-1';

  const product = (overrides: Record<string, any> = {}) => ({
    id: 'product-1',
    vendorId: 'vendor-1',
    name: 'Test Product',
    price: '12.50',
    stockCount: 5,
    isActive: true,
    ...overrides,
  });

  const item = (productId = 'product-1', quantity = 2) => ({
    productId,
    quantity,
  });

  beforeEach(() => {
    products = new Map([['product-1', product()]]);

    provider = {
      createOrder: jest.fn().mockResolvedValue({
        id: 'order_provider_1',
        amount: 2500,
        currency: 'INR',
        status: 'created',
        receipt: 'ORD-order-1',
      }),
      getPublicKeyId: jest.fn().mockReturnValue('rzp_test_unit_key'),
    };

    audit = {
      logInventoryDecrement: jest.fn().mockResolvedValue(undefined),
      logOrderCreated: jest.fn().mockResolvedValue(undefined),
    };

    const savedOrder = {
      id: 'order-1',
      orderNumber: 'ORD-20261027-000001',
    };

    manager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('pg_advisory_xact_lock')) return [];
        if (sql.includes('FROM payment_authorizations')) return [];
        if (sql.includes("nextval('order_number_seq')")) return [{ seq: 1 }];
        throw new Error(`Unexpected SQL in test: ${sql}`);
      }),

      find: jest.fn().mockResolvedValue([]),

      createQueryBuilder: jest.fn(() => {
        let selectedId: string | undefined;
        const chain: any = {
          setLock: jest.fn(() => chain),
          where: jest.fn((_sql: string, params: { id: string }) => {
            selectedId = params.id;
            return chain;
          }),
          getOne: jest.fn(async () => products.get(selectedId!) ?? null),
        };
        return chain;
      }),

      create: jest.fn((_entity: any, values: any) => ({ ...values })),

      save: jest.fn(async (entityClass: any, value: any) => {
        if (entityClass === Order) return { ...savedOrder, ...value };
        return value;
      }),

      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource = {
      transaction: jest.fn(async (callback: (m: any) => Promise<any>) =>
        callback(manager),
      ),
    };

    service = new RazorpayInitiationService(
      provider as unknown as RazorpayProviderService,
      dataSource as unknown as DataSource,
      audit as unknown as AuditService,
    );
  });

  it('rejects an empty cart before starting a transaction', async () => {
    await expect(
      service.initiate([], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid shipping addresses and missing buyer identity', async () => {
    await expect(
      service.initiate([item()], '  ', buyerId, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.initiate([item()], address, '', correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate product IDs and invalid quantities', async () => {
    await expect(
      service.initiate([item(), item()], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.initiate([item('product-1', 0)], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.initiate([item('product-1', 1.5)], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects missing products and inactive products', async () => {
    await expect(
      service.initiate([item('missing-product', 1)], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(NotFoundException);

    products.set('product-1', product({ isActive: false }));

    await expect(
      service.initiate([item()], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(provider.createOrder).not.toHaveBeenCalled();
  });

  it('rejects insufficient inventory before creating a provider order', async () => {
    products.set('product-1', product({ stockCount: 1 }));

    await expect(
      service.initiate([item('product-1', 2)], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(provider.createOrder).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects an unsafe line-item amount before creating a provider order', async () => {
    products.set(
      'product-1',
      product({
        price: '10000000',
        stockCount: 10000000,
      }),
    );

    await expect(
      service.initiate(
        [item('product-1', 10000000)],
        address,
        buyerId,
        correlationId,
      ),
    ).rejects.toThrow('Cart line amount overflow or invalid.');

    expect(provider.createOrder).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects a cart total that exceeds the safe integer range', async () => {
    products.set(
      'product-1',
      product({
        price: '50000000000000',
        stockCount: 2,
      }),
    );
    products.set(
      'product-2',
      product({
        id: 'product-2',
        price: '50000000000000',
        stockCount: 2,
      }),
    );

    await expect(
      service.initiate(
        [item('product-1', 1), item('product-2', 1)],
        address,
        buyerId,
        correlationId,
      ),
    ).rejects.toThrow('Cart total overflow or invalid.');

    expect(provider.createOrder).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });
  it('calculates the INR amount from product price and quantity on the server', async () => {
    const result = await service.initiate(
      [item('product-1', 2)],
      address,
      buyerId,
      correlationId,
    );

    expect(provider.createOrder).toHaveBeenCalledWith(
      2500,
      'ORD-order-1',
      {
        orderId: 'order-1',
        buyerId,
        correlationId,
      },
    );

    expect(result).toMatchObject({
      success: true,
      orderId: 'order-1',
      providerOrderId: 'order_provider_1',
      amountPaise: 2500,
      currency: 'INR',
    });
  });

  it('rejects a provider amount or currency mismatch before inventory mutation', async () => {
    provider.createOrder.mockResolvedValue({
      id: 'order_provider_bad',
      amount: 2499,
      currency: 'INR',
      status: 'created',
      receipt: null,
    });

    await expect(
      service.initiate([item()], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(manager.update).not.toHaveBeenCalled();

    provider.createOrder.mockResolvedValue({
      id: 'order_provider_bad_currency',
      amount: 1250,
      currency: 'USD',
      status: 'created',
      receipt: null,
    });

    await expect(
      service.initiate([item('product-1', 1)], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(manager.update).not.toHaveBeenCalled();
  });

  it('decrements stock and persists order lines and a pending payment', async () => {
    const result = await service.initiate(
      [item('product-1', 2)],
      address,
      buyerId,
      correlationId,
    );

    expect(manager.update).toHaveBeenCalledWith(
      Product,
      { id: 'product-1' },
      { stockCount: 3 },
    );

    expect(audit.logInventoryDecrement).toHaveBeenCalledWith(
      correlationId,
      'product-1',
      5,
      3,
      2,
    );

    const lineSave = manager.save.mock.calls.find(
      ([entityClass]: [any, any]) => entityClass === OrderLineItem,
    );
    expect(lineSave).toBeDefined();
    expect(lineSave[1]).toEqual([
      expect.objectContaining({
        orderId: 'order-1',
        productId: 'product-1',
        vendorId: 'vendor-1',
        quantity: 2,
        unitPrice: 12.5,
        lineTotal: 25,
        fulfillmentStatus: FulfillmentStatus.PENDING,
      }),
    ]);

    const paymentSave = manager.save.mock.calls.find(
      ([entityClass]: [any, any]) => entityClass === PaymentAuthorization,
    );
    expect(paymentSave).toBeDefined();
    expect(paymentSave[1]).toEqual(
      expect.objectContaining({
        orderId: 'order-1',
        amount: 25,
        status: PaymentStatus.PENDING,
        provider: 'razorpay',
        providerOrderId: 'order_provider_1',
        providerReference: null,
      }),
    );

    expect(audit.logOrderCreated).toHaveBeenCalledWith(
      correlationId,
      'order-1',
      buyerId,
      25,
    );
    expect(result.success).toBe(true);
  });

  it('reuses an identical pending checkout without reserving stock twice', async () => {
    manager.query.mockImplementation(async (sql: string) => {
      if (sql.includes('pg_advisory_xact_lock')) return [];
      if (sql.includes('FROM payment_authorizations')) {
        return [{
          paymentId: 'payment-existing',
          orderId: 'order-existing',
          amount: '25.00',
          providerOrderId: 'order_provider_existing',
          orderNumber: 'ORD-EXISTING',
          shippingAddress: address,
        }];
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    });

    manager.find.mockResolvedValue([
      { productId: 'product-1', quantity: 2 },
    ]);

    const result = await service.initiate(
      [item('product-1', 2)],
      address,
      buyerId,
      correlationId,
    );

    expect(result).toMatchObject({
      success: true,
      orderId: 'order-existing',
      providerOrderId: 'order_provider_existing',
      amountPaise: 2500,
      currency: 'INR',
    });

    expect(provider.createOrder).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rejects a different cart when a pending checkout already exists', async () => {
    manager.query.mockImplementation(async (sql: string) => {
      if (sql.includes('pg_advisory_xact_lock')) return [];
      if (sql.includes('FROM payment_authorizations')) {
        return [{
          paymentId: 'payment-existing',
          orderId: 'order-existing',
          amount: '25.00',
          providerOrderId: 'order_provider_existing',
          orderNumber: 'ORD-EXISTING',
          shippingAddress: address,
        }];
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    });

    manager.find.mockResolvedValue([
      { productId: 'product-1', quantity: 1 },
    ]);

    await expect(
      service.initiate([item('product-1', 2)], address, buyerId, correlationId),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(provider.createOrder).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('propagates provider errors rather than returning checkout success', async () => {
    provider.createOrder.mockRejectedValue(new Error('Provider unavailable'));

    await expect(
      service.initiate([item()], address, buyerId, correlationId),
    ).rejects.toThrow('Provider unavailable');

    expect(manager.update).not.toHaveBeenCalled();
  });
});
