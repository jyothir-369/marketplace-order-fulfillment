import { Test, TestingModule } from '@nestjs/testing';
import { FulfillmentService } from './fulfillment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { PaymentAuthorization } from '../common/entities/payment-authorization.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';

import { VendorMockService } from '../integrations/vendor-mock/vendor-mock.service';
import { AuditService } from '../common/audit';

describe('FulfillmentService - Hardening', () => {
  let service: FulfillmentService;
  let orderRepositoryMock: any;
  let lineItemRepositoryMock: any;

  beforeEach(async () => {
    orderRepositoryMock = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    lineItemRepositoryMock = {
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FulfillmentService,
        { provide: getRepositoryToken(Order), useValue: orderRepositoryMock },
        { provide: getRepositoryToken(PaymentAuthorization), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepositoryMock },
        { provide: getRepositoryToken(VendorSyncJob), useValue: {} },
        { provide: VendorMockService, useValue: {} },
        { provide: AuditService, useValue: { logOrderStatusChange: jest.fn() } },
      ],
    }).compile();

    service = module.get<FulfillmentService>(FulfillmentService);
  });

  it('should not update order status if already cancelled', async () => {
    // checkOrderFulfillment reads line items from the line-item repository
    // (not the order's embedded lineItems, which TypeORM never loads here).
    lineItemRepositoryMock.find.mockResolvedValue([]);
    orderRepositoryMock.findOne.mockResolvedValue({ id: 'ord1', status: OrderStatus.CANCELLED });

    await service.checkOrderFulfillment('ord1', 'c1');

    // Terminal (cancelled) order must not be flipped back to an active status.
    expect(orderRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('should handle multi-vendor order with mixed states correctly', async () => {
    lineItemRepositoryMock.find.mockResolvedValue([
      { fulfillmentStatus: FulfillmentStatus.CONFIRMED },
      { fulfillmentStatus: FulfillmentStatus.PENDING },
    ]);

    await service.checkOrderFulfillment('ord1', 'c1');

    // Not all items confirmed => order stays FULFILLING, no update.
    expect(orderRepositoryMock.update).not.toHaveBeenCalled();
  });
  it('does not fulfill an order containing failed line items', async () => {
    lineItemRepositoryMock.find.mockResolvedValue([
      { fulfillmentStatus: FulfillmentStatus.CONFIRMED },
      { fulfillmentStatus: FulfillmentStatus.FAILED },
    ]);
    orderRepositoryMock.findOne.mockResolvedValue({
      id: 'ord1',
      status: OrderStatus.CONFIRMED,
    });

    await service.checkOrderFulfillment('ord1', 'c1');

    expect(orderRepositoryMock.update).toHaveBeenCalledWith('ord1', {
      status: OrderStatus.FULFILLING,
    });
    expect(orderRepositoryMock.update).not.toHaveBeenCalledWith('ord1', {
      status: OrderStatus.FULFILLED,
    });
  });

  it('moves an order with dead-letter items to FULFILLING', async () => {
    lineItemRepositoryMock.find.mockResolvedValue([
      { fulfillmentStatus: FulfillmentStatus.DEAD_LETTER },
      { fulfillmentStatus: FulfillmentStatus.PENDING },
    ]);
    orderRepositoryMock.findOne.mockResolvedValue({
      id: 'ord1',
      status: OrderStatus.CONFIRMED,
    });

    await service.checkOrderFulfillment('ord1', 'c1');

    expect(orderRepositoryMock.update).toHaveBeenCalledWith('ord1', {
      status: OrderStatus.FULFILLING,
    });
  });

  it('does not fulfill an order with no line items', async () => {
    lineItemRepositoryMock.find.mockResolvedValue([]);

    await service.checkOrderFulfillment('ord1', 'c1');

    expect(orderRepositoryMock.findOne).not.toHaveBeenCalled();
    expect(orderRepositoryMock.update).not.toHaveBeenCalled();
  });
});
