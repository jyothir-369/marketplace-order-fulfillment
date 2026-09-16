import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { DataSource } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../common/audit';
import { VendorQueueService } from '../fulfillment/vendor-queue.service';

describe('OrdersService - Lifecycle', () => {
  let service: OrdersService;
  let orderRepositoryMock: any;
  let lineItemRepositoryMock: any;
  let auditMock: any;
  let inventoryMock: any;
  let dataSourceMock: any;
  let managerMock: any;

  beforeEach(async () => {
    orderRepositoryMock = {
      findOne: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
    };
    lineItemRepositoryMock = {
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };
    // cancelOrder runs inside dataSource.transaction() and does every read/write
    // through the transaction manager (Phase 1.6), so the spec drives managerMock.
    managerMock = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    dataSourceMock = {
      transaction: jest.fn((cb: (m: any) => any) => cb(managerMock)),
    };
    auditMock = {
      logOrderStatusChange: jest.fn().mockResolvedValue(undefined),
    };
    inventoryMock = {
      restoreStock: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepositoryMock },
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepositoryMock },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: InventoryService, useValue: inventoryMock },
        { provide: AuditService, useValue: auditMock },
        { provide: VendorQueueService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should prevent cancellation of FULFILLED orders', async () => {
    managerMock.findOne.mockResolvedValue({ id: 'ord1', status: OrderStatus.FULFILLED });

    await expect(service.cancelOrder('ord1', 'c1')).rejects.toThrow('Cannot cancel order in status: fulfilled');
  });

  it('should allow cancellation of PLACED orders', async () => {
    managerMock.findOne.mockResolvedValue({
      id: 'ord1',
      status: OrderStatus.PLACED,
      lineItems: [],
    });

    await service.cancelOrder('ord1', 'c1');
    expect(managerMock.update).toHaveBeenCalledWith(Order, { id: 'ord1' }, { status: OrderStatus.CANCELLED });
  });

  describe('transitionOrder', () => {
    it('CONFIRM moves PLACED -> CONFIRMED and writes an audit entry', async () => {
      orderRepositoryMock.findOne
        .mockResolvedValueOnce({ id: 'ord1', status: OrderStatus.PLACED, lineItems: [] })
        // second call is from getOrderById after the update
        .mockResolvedValueOnce({ id: 'ord1', status: OrderStatus.CONFIRMED, lineItems: [] });

      const result = await service.transitionOrder('ord1', { action: 'CONFIRM' }, 'c1', 'vendor-1');

      expect(orderRepositoryMock.update).toHaveBeenCalledWith('ord1', { status: OrderStatus.CONFIRMED });
      expect(auditMock.logOrderStatusChange).toHaveBeenCalledWith('c1', 'ord1', OrderStatus.PLACED, OrderStatus.CONFIRMED, 'vendor-1');
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('FULFILL moves CONFIRMED -> FULFILLING', async () => {
      orderRepositoryMock.findOne
        .mockResolvedValueOnce({ id: 'ord1', status: OrderStatus.CONFIRMED, lineItems: [] })
        .mockResolvedValueOnce({ id: 'ord1', status: OrderStatus.FULFILLING, lineItems: [] });

      await service.transitionOrder('ord1', { action: 'FULFILL' }, 'c1');

      expect(orderRepositoryMock.update).toHaveBeenCalledWith('ord1', { status: OrderStatus.FULFILLING });
    });

    it('SHIP moves FULFILLING -> FULFILLED', async () => {
      orderRepositoryMock.findOne
        .mockResolvedValueOnce({ id: 'ord1', status: OrderStatus.FULFILLING, lineItems: [] })
        .mockResolvedValueOnce({ id: 'ord1', status: OrderStatus.FULFILLED, lineItems: [] });

      await service.transitionOrder('ord1', { action: 'SHIP' }, 'c1');

      expect(orderRepositoryMock.update).toHaveBeenCalledWith('ord1', { status: OrderStatus.FULFILLED });
    });

    it('rejects an illegal transition (CONFIRM from FULFILLED)', async () => {
      orderRepositoryMock.findOne.mockResolvedValue({ id: 'ord1', status: OrderStatus.FULFILLED });

      await expect(
        service.transitionOrder('ord1', { action: 'CONFIRM' }, 'c1'),
      ).rejects.toThrow(/Illegal transition CONFIRM/);

      expect(orderRepositoryMock.update).not.toHaveBeenCalled();
      expect(auditMock.logOrderStatusChange).not.toHaveBeenCalled();
    });

    it('CANCEL delegates to cancelOrder and restores inventory for pending items', async () => {
      // First manager.findOne is the locked read inside the transaction; second
      // is the post-cancel refresh for the DTO.
      managerMock.findOne
        .mockResolvedValueOnce({
          id: 'ord1',
          status: OrderStatus.CONFIRMED,
          lineItems: [
            { id: 'li1', productId: 'p1', quantity: 2, fulfillmentStatus: FulfillmentStatus.PENDING },
          ],
        })
        .mockResolvedValueOnce({
          id: 'ord1',
          status: OrderStatus.CANCELLED,
          lineItems: [
            { id: 'li1', productId: 'p1', quantity: 2, fulfillmentStatus: FulfillmentStatus.FAILED, failureReason: 'Order cancelled' },
          ],
        });

      await service.transitionOrder('ord1', { action: 'CANCEL', reason: 'buyer request' }, 'c1');

      // restoreStock now receives the transaction manager as its 5th arg (Phase 1.6).
      expect(inventoryMock.restoreStock).toHaveBeenCalledWith('p1', 2, 'c1', 'Order cancellation', managerMock);
      expect(managerMock.update).toHaveBeenCalledWith(Order, { id: 'ord1' }, { status: OrderStatus.CANCELLED });
    });

    it('returns 404 for an unknown order id', async () => {
      orderRepositoryMock.findOne.mockResolvedValue(null);

      await expect(
        service.transitionOrder('missing', { action: 'CONFIRM' }, 'c1'),
      ).rejects.toThrow('Order missing not found');
    });
  });

  describe('getOrdersByVendor', () => {
    it('returns an empty list when the vendor has no line items', async () => {
      const result = await service.getOrdersByVendor('vendor-x');
      expect(result).toEqual([]);
      expect(orderRepositoryMock.find).not.toHaveBeenCalled();
    });

    it('returns distinct orders for a vendor with line items', async () => {
      lineItemRepositoryMock.createQueryBuilder.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ orderId: 'o1' }, { orderId: 'o2' }]),
      });
      orderRepositoryMock.find.mockResolvedValue([
        { id: 'o1', status: OrderStatus.PLACED, lineItems: [] },
        { id: 'o2', status: OrderStatus.FULFILLING, lineItems: [] },
      ]);

      const result = await service.getOrdersByVendor('vendor-x');
      expect(result).toHaveLength(2);
      expect(orderRepositoryMock.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: [{ id: 'o1' }, { id: 'o2' }] }),
      );
    });
  });
});
