import { Test, TestingModule } from '@nestjs/testing';
import { FulfillmentService } from './fulfillment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';

import { VendorMockService } from '../integrations/vendor-mock/vendor-mock.service';
import { AuditService } from '../common/audit';

describe('FulfillmentService - Hardening', () => {
  let service: FulfillmentService;
  let orderRepositoryMock: any;

  beforeEach(async () => {
    orderRepositoryMock = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FulfillmentService,
        { provide: getRepositoryToken(Order), useValue: orderRepositoryMock },
        { provide: getRepositoryToken(OrderLineItem), useValue: {} },
        { provide: getRepositoryToken(VendorSyncJob), useValue: {} },
        { provide: VendorMockService, useValue: {} },
        { provide: AuditService, useValue: { logOrderStatusChange: jest.fn() } },
      ],
    }).compile();

    service = module.get<FulfillmentService>(FulfillmentService);
  });

  it('should not update order status if already cancelled', async () => {
    orderRepositoryMock.findOne.mockResolvedValue({ id: 'ord1', status: OrderStatus.CANCELLED, lineItems: [] });

    await service.checkOrderFulfillment('ord1', 'c1');

    expect(orderRepositoryMock.update).not.toHaveBeenCalled();
  });

  it('should handle multi-vendor order with mixed states correctly', async () => {
    orderRepositoryMock.findOne.mockResolvedValue({
      id: 'ord1',
      status: OrderStatus.FULFILLING,
      lineItems: [
        { fulfillmentStatus: FulfillmentStatus.CONFIRMED },
        { fulfillmentStatus: FulfillmentStatus.PENDING },
      ],
    });

    await service.checkOrderFulfillment('ord1', 'c1');

    // Should remain FULFILLING
    expect(orderRepositoryMock.update).not.toHaveBeenCalled();
  });
});
