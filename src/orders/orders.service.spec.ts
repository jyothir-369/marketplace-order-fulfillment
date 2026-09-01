import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderLineItem, Product } from '../common/entities';
import { DataSource } from 'typeorm';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../common/audit';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: getRepositoryToken(OrderLineItem), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: {} },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: InventoryService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
