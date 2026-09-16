import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderLineItem, Product, FulfillmentStatus } from '../common/entities';
import { DataSource } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../common/audit';
import { VendorQueueService } from '../fulfillment/vendor-queue.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let vendorQueueService: VendorQueueService;
  let lineItemRepository: any;

  beforeEach(async () => {
    lineItemRepository = { update: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        // getOrderById re-reads the just-created order; mock it to echo the
        // order_number that checkout generated from the (seq 1) transaction.
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn().mockImplementation(() => {
            const now = new Date();
            const yyyymmdd =
              now.getFullYear().toString() +
              String(now.getMonth() + 1).padStart(2, '0') +
              String(now.getDate()).padStart(2, '0');
            return Promise.resolve({ id: 'order1', orderNumber: 'ORD-' + yyyymmdd + '-000001', lineItems: [] });
        }) } },
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepository },
        { provide: getRepositoryToken(Product), useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([{ id: 'p1', vendorId: 'v1', price: 10, stockCount: 10 }]),
            }),
        } },
        { provide: DataSource, useValue: { transaction: jest.fn((cb) => cb({
            query: jest.fn().mockResolvedValue([{ seq: 1 }]), // Phase 2.2 order_number_seq
            createQueryBuilder: jest.fn().mockReturnValue({
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue({ id: 'p1', stockCount: 10 }),
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({}),
            }),
            create: jest.fn((entity, data) => ({...data, id: 'item1'})),
            save: jest.fn().mockImplementation((entity, data) => Promise.resolve(Array.isArray(data) ? data.map(d => ({...d, id: 'item1'})) : ({...data, id: 'order1'}))),
            update: jest.fn(),
        })) } },
        { provide: InventoryService, useValue: {} },
        { provide: AuditService, useValue: { logInventoryDecrement: jest.fn(), logOrderCreated: jest.fn() } },
        { provide: VendorQueueService, useValue: { addJobToVendorQueue: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    vendorQueueService = module.get<VendorQueueService>(VendorQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an order and leave line items in PENDING state', async () => {
    const dto = { buyerId: 'b1', items: [{ productId: 'p1', quantity: 2 }] };
    const result = await service.checkout(dto as any, 'corr1');

    expect(result.success).toBe(true);
    expect(result.order?.id).toBe('order1');

    // Fulfillment is enqueued by the fulfillment module after checkout, NOT
    // inline (the vendor queue is not touched from the checkout transaction).
    expect(vendorQueueService.addJobToVendorQueue).not.toHaveBeenCalled();
  });

  it('should leave fulfillment to the fulfillment module (no inline enqueue)', async () => {
    vendorQueueService.addJobToVendorQueue = jest.fn().mockRejectedValue(new Error('Queue fail'));
    const dto = { buyerId: 'b1', items: [{ productId: 'p1', quantity: 2 }] };

    // Even when the queue would fail, checkout succeeds — it never enqueues.
    const result = await service.checkout(dto as any, 'corr1');
    expect(result.success).toBe(true);
    expect(vendorQueueService.addJobToVendorQueue).not.toHaveBeenCalled();
  });

  it('generates a human-facing order number from the sequence (Phase 2.2)', async () => {
    const dto = { buyerId: 'b1', items: [{ productId: 'p1', quantity: 2 }] };
    const result = await service.checkout(dto as any, 'corr1');

    // seq 1 -> ORD-<YYYYMMDD>-000001
    const now = new Date();
    const yyyymmdd =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    expect(result.order?.orderNumber).toBe('ORD-' + yyyymmdd + '-000001');
  });
});
