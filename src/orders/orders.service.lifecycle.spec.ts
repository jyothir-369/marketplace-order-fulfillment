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
  let dataSourceMock: any;

  beforeEach(async () => {
    orderRepositoryMock = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    lineItemRepositoryMock = {
      update: jest.fn(),
    };
    dataSourceMock = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepositoryMock },
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepositoryMock },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: InventoryService, useValue: { restoreStock: jest.fn() } },
        { provide: AuditService, useValue: { logOrderStatusChange: jest.fn() } },
        { provide: VendorQueueService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should prevent cancellation of FULFILLED orders', async () => {
    orderRepositoryMock.findOne.mockResolvedValue({ id: 'ord1', status: OrderStatus.FULFILLED });

    await expect(service.cancelOrder('ord1', 'c1')).rejects.toThrow('Cannot cancel order in status: fulfilled');
  });

  it('should allow cancellation of PLACED orders', async () => {
    orderRepositoryMock.findOne.mockResolvedValue({ 
      id: 'ord1', 
      status: OrderStatus.PLACED, 
      lineItems: [] 
    });

    await service.cancelOrder('ord1', 'c1');
    expect(orderRepositoryMock.update).toHaveBeenCalledWith('ord1', { status: OrderStatus.CANCELLED });
  });
});
