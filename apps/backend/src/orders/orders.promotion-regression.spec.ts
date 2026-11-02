import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderLineItem, Product, FulfillmentStatus } from '../common/entities';
import { Promotion } from '../common/entities/promotion.entity';
import { DataSource } from 'typeorm';
import { PaymentsService } from '../payments/payments.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../common/audit';
import { PAYMENT_SUCCESS_TOKEN } from '../payments/mock-payment.service';

describe('OrdersService promotion regression', () => {
  let service: OrdersService;
  let paymentsService: any;
  let savedLineItems: any[];

  beforeEach(async () => {
    savedLineItems = [];
    paymentsService = { authorize: jest.fn().mockResolvedValue({ success: true, message: 'ok' }), recordCapture: jest.fn(), refund: jest.fn(), findByOrderId: jest.fn().mockResolvedValue([]) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(OrderLineItem), useValue: { update: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(Product), useValue: {
          createQueryBuilder: jest.fn().mockReturnValue({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: 'p1', vendorId: 'v1', price: 100, stockCount: 10, name: 'Promo' }]),
          }),
        } },
        { provide: getRepositoryToken(Promotion), useValue: {
          find: jest.fn().mockResolvedValue([{ id: 'promo1', vendorId: 'v1', discountPercent: 20, isActive: true, startDate: new Date('2020-01-01'), endDate: new Date('2030-01-01'), createdAt: new Date() }]),
        } },
        { provide: DataSource, useValue: { transaction: jest.fn((cb: any) => cb({
          getRepository: (entity: any) => entity === Promotion
            ? { find: jest.fn().mockResolvedValue([{ id: 'promo1', vendorId: 'v1', discountPercent: 20, isActive: true, startDate: new Date('2020-01-01'), endDate: new Date('2030-01-01'), createdAt: new Date() }]) }
            : { findOne: jest.fn().mockResolvedValue({ id: 'o1', totalAmount: 80, status: 'PLACED', lineItems: [{id:'i1', productId:'p1', quantity:1, unitPrice:100, lineTotal:80, fulfillmentStatus:'pending', promotionId:'promo1', promotionDiscountPercent:20, effectiveUnitPrice:80}] }) },
          query: jest.fn().mockResolvedValue([{ seq: 1 }]),
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({ id: 'p1', stockCount: 10 }),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({}),
          }),
          create: jest.fn((entity: any, data: any) => ({...data, id: 'o1'})),
          save: jest.fn().mockImplementation((entity: any, data: any) => { if (entity === OrderLineItem) savedLineItems = data; return Promise.resolve(Array.isArray(data) ? data.map((d: any) => ({...d, id: 'item1'})) : ({...data, id: 'o1'})); }),
          update: jest.fn().mockResolvedValue({}),
        })) } },
        { provide: InventoryService, useValue: { restoreStock: jest.fn() } },
        { provide: AuditService, useValue: { logPaymentFailed: jest.fn(), logInventoryDecrement: jest.fn(), logOrderCreated: jest.fn() } },
        { provide: PaymentsService, useValue: paymentsService },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  it('checkout with promotion uses promotion-adjusted total (regression)', async () => {
    const result = await service.checkout({
      buyerId: 'buyer1', buyerUserId: null,
      items: [{ productId: 'p1', quantity: 1 }],
      paymentMethodToken: PAYMENT_SUCCESS_TOKEN,
    }, 'correlation-1');
    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();
    expect(paymentsService.authorize).toHaveBeenCalledWith(80, 'correlation-1', PAYMENT_SUCCESS_TOKEN);
    expect(savedLineItems).toHaveLength(1);
    expect(savedLineItems[0]).toEqual(expect.objectContaining({ unitPrice: 100, lineTotal: 80, effectiveUnitPrice: 80, promotionId: 'promo1', promotionDiscountPercent: 20 }));
    expect(paymentsService.recordCapture).toHaveBeenCalledWith(expect.anything(), 'o1', 80, expect.objectContaining({ success: true }), 'correlation-1');
  });
});
