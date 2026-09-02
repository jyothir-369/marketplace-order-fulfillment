import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { OrdersService } from '../orders/orders.service';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { AuditService } from '../common/audit';

describe('AdminService', () => {
  let service: AdminService;
  let orderRepositoryMock: any;
  let lineItemRepositoryMock: any;
  let syncJobRepositoryMock: any;
  let fulfillmentServiceMock: any;

  beforeEach(async () => {
    orderRepositoryMock = {
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      findOne: jest.fn(),
    };
    lineItemRepositoryMock = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };
    syncJobRepositoryMock = {
        count: jest.fn().mockResolvedValue(0),
    };
    fulfillmentServiceMock = {
        manualResolve: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Order), useValue: orderRepositoryMock },
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepositoryMock },
        { provide: getRepositoryToken(VendorSyncJob), useValue: syncJobRepositoryMock },
        { provide: OrdersService, useValue: {} },
        { provide: FulfillmentService, useValue: fulfillmentServiceMock },
        { provide: AuditService, useValue: { logAdminResolution: jest.fn() } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty list when no orders found', async () => {
    const result = await service.getOrders({}, 'c1');
    expect(result.total).toBe(0);
    expect(result.orders).toEqual([]);
  });

  it('should resolve job via manual resolution', async () => {
    const lineItem = { id: 'li1', fulfillmentStatus: FulfillmentStatus.AMBIGUOUS };
    lineItemRepositoryMock.findOne.mockResolvedValue(lineItem);
    
    await service.resolveOrderLineItem('li1', { newFulfillmentStatus: FulfillmentStatus.CONFIRMED }, 'c1');
    
    expect(fulfillmentServiceMock.manualResolve).toHaveBeenCalled();
  });

  it('should throw error when resolving non-existent line item', async () => {
    lineItemRepositoryMock.findOne.mockResolvedValue(null);
    
    await expect(service.resolveOrderLineItem('non-existent', { newFulfillmentStatus: FulfillmentStatus.CONFIRMED }, 'c1'))
      .rejects.toThrow('Line item non-existent not found');
  });
});
