import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../common/entities/order.entity';
import { User, UserRole } from '../common/entities/user.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { AuthService } from '../auth/auth.service';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { OrdersService } from '../orders/orders.service';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { AuditService } from '../common/audit/audit.service';
import { Product } from '../common/entities/product.entity';
import { VendorApplication } from '../vendor/vendor-application.entity';

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
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn(), find: jest.fn(), manager: { transaction: jest.fn(async (fn) => fn({ findOne: jest.fn(), update: jest.fn() })) } } },
        { provide: getRepositoryToken(Vendor), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Product), useValue: { count: jest.fn().mockResolvedValue(0), findOne: jest.fn() } },
        { provide: getRepositoryToken(VendorApplication), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: AuthService, useValue: { revokeAllForUser: jest.fn(async () => 1) } },
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
    // Phase 4.4: this previously called `service.getOrders(...)`, a method
    // AdminService never had (the reason the spec was excluded from CI).
    // The implemented order-listing method is getStuckOrders — same contract.
    lineItemRepositoryMock.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    const result = await service.getStuckOrders('c1');
    expect(result.total).toBe(0);
    expect(result.orders).toEqual([]);
  });

  it('should include totalRevenue in dashboard', async () => {
    // Revenue query: must include innerJoin + where/andWhere; mock both branches
    orderRepositoryMock.createQueryBuilder.mockImplementation((alias?: string) => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'placed', count: '1' },
          { status: 'fulfilled', count: '2' },
        ]),
        getRawOne: jest.fn().mockResolvedValue({ total: '123.45' }),
      };
      return qb;
    });
    orderRepositoryMock.count = jest.fn().mockResolvedValue(3);
    syncJobRepositoryMock.count = jest.fn().mockResolvedValue(0);
    const result = await service.getDashboard('c1');
    expect(result.totalRevenue).toBeCloseTo(123.45, 2);
  });

  it('should include totalRevenue only for captured-payment orders in included statuses', async () => {
    // Revenue rule test: included statuses (CONFIRMED, FULFILLING, FULFILLED) with
    // CAPTURED payments are counted; CANCELLED / PLACED / FAILED excluded.
    orderRepositoryMock.createQueryBuilder.mockImplementation((alias?: string) => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'confirmed', count: '2' },
          { status: 'fulfilling', count: '1' },
          { status: 'fulfilled', count: '3' },
        ]),
        getRawOne: jest.fn().mockResolvedValue({ total: '678.90' }),
      };
      return qb;
    });
    orderRepositoryMock.count = jest.fn().mockResolvedValue(8);
    syncJobRepositoryMock.count = jest.fn().mockResolvedValue(1);
    const result = await service.getDashboard('c1');
    expect(result.totalRevenue).toBeCloseTo(678.9, 2);
    expect(result.totalOrders).toBe(8);
  });

  it('should return zero revenue when no captured payments exist', async () => {
    orderRepositoryMock.createQueryBuilder.mockImplementation((alias?: string) => ({
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
    }));
    orderRepositoryMock.count = jest.fn().mockResolvedValue(0);
    syncJobRepositoryMock.count = jest.fn().mockResolvedValue(0);
    const result = await service.getDashboard('c2');
    expect(result.totalRevenue).toBe(0);
    expect(result.pendingOrders).toBe(0);
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

describe('AdminService — Phase 1 vendor-account linking (D1/D9/D10)', () => {
  let userRepoMock: any;
  let vendorRepoMock: any;
  let authServiceMock: any;

  beforeEach(() => {
    userRepoMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      manager: {
        transaction: jest.fn(async (fn: any) => fn({ findOne: jest.fn().mockResolvedValue({ id: 'u1', role: 'buyer', vendorId: null }), update: jest.fn() })),
      },
    };
    vendorRepoMock = { findOne: jest.fn().mockResolvedValue({ id: 'v1', name: 'Demo Vendor' }) };
    authServiceMock = { revokeAllForUser: jest.fn().mockResolvedValue(1) };
  });

  it('successful link: asserts update, revocation, audit, transitioned', async () => {
    const auditMock = { log: jest.fn().mockResolvedValue(1) };
    const revokeMock = jest.fn().mockResolvedValue(1);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(OrderLineItem), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(VendorSyncJob), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'u1', email: 'buyer@test.dev', role: UserRole.BUYER, vendorId: null }), manager: { transaction: jest.fn(async (fn: any) => { const m = { findOne: jest.fn().mockResolvedValue({ id: 'u1', role: UserRole.BUYER, vendorId: null }), update: jest.fn().mockImplementation((e: any, id: any, d: any) => Promise.resolve({ id, ...d })) }; return fn(m); }) } } },
        { provide: getRepositoryToken(Vendor), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'v1', name: 'Demo Vendor' }) } },
        { provide: getRepositoryToken(Product), useValue: { count: jest.fn().mockResolvedValue(0), findOne: jest.fn() } },
        { provide: AuthService, useValue: { revokeAllForUser: revokeMock } },
        { provide: getRepositoryToken(VendorApplication), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: AuditService, useValue: { log: auditMock.log, logAdminResolution: jest.fn() } },
        { provide: OrdersService, useValue: {} },
        { provide: FulfillmentService, useValue: {} },
      ],
    }).compile();
    const svc = module.get(AdminService);
    const res = await svc.linkUser('v1', 'buyer@test.dev', 'c1');
    expect(res.transitioned).toBe(true);
    expect(revokeMock).toHaveBeenCalledWith('u1');
    expect(revokeMock).toHaveBeenCalledTimes(1);
    expect(auditMock.log).toHaveBeenCalledTimes(1);
    const auditCall = auditMock.log.mock.calls[0];
    expect(auditCall[0]).toMatchObject({ action: 'ADMIN_RESOLUTION' });
  });

  it('already linked to same vendor: idempotent result, no update, no revocation, no audit', async () => {
    const auditMock = { log: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(OrderLineItem), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(VendorSyncJob), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(Product), useValue: { count: jest.fn().mockResolvedValue(0), findOne: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'u1', email: 'buyer@test.dev', role: UserRole.VENDOR, vendorId: 'v1' }), manager: { transaction: jest.fn(async (fn: any) => { const m = { findOne: jest.fn().mockResolvedValue({ id: 'u1', role: UserRole.VENDOR, vendorId: 'v1' }), update: jest.fn() }; return fn(m); }) } } },
        { provide: getRepositoryToken(Vendor), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'v1' }) } },
        { provide: getRepositoryToken(VendorApplication), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: AuthService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn(), logAdminResolution: jest.fn() } },
        { provide: OrdersService, useValue: {} },
        { provide: FulfillmentService, useValue: {} },
      ],
    }).compile();
    const svc = module.get(AdminService);
    const res = await svc.linkUser('v1', 'buyer@test.dev', 'c2');
    expect(res.transitioned).toBe(false);
  });

  it('admin linking: conflict, no transaction', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(OrderLineItem), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Product), useValue: { count: jest.fn().mockResolvedValue(0), findOne: jest.fn() } },
        { provide: getRepositoryToken(VendorSyncJob), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'u1', email: 'admin@test.dev', role: UserRole.ADMIN, vendorId: null }), manager: { transaction: jest.fn() } } },
        { provide: getRepositoryToken(Vendor), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'v1' }) } },
        { provide: getRepositoryToken(VendorApplication), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: AuthService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: OrdersService, useValue: {} },
        { provide: FulfillmentService, useValue: {} },
      ],
    }).compile();
    const svc = module.get(AdminService);
    await expect(svc.linkUser('v1', 'admin@test.dev', 'c3')).rejects.toThrow('Privileged');
  });

  it('successful unlink: BUYER + vendorId null, revocation + audit', async () => {
    const auditMock = { log: jest.fn().mockResolvedValue(1) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Order), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(OrderLineItem), useValue: { findOne: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(VendorSyncJob), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: getRepositoryToken(Product), useValue: { count: jest.fn().mockResolvedValue(0), findOne: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'u1', email: 'buyer@test.dev', role: UserRole.VENDOR, vendorId: 'v1' }), manager: { transaction: jest.fn(async (fn) => { const m = { findOne: jest.fn().mockResolvedValue({ id: 'u1', role: UserRole.VENDOR, vendorId: 'v1' }), update: jest.fn().mockImplementation((e: any, id:any,d:any) => Promise.resolve({id,...d})) }; return fn(m); }) } } },
        { provide: getRepositoryToken(Vendor), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'v1' }) } },
        { provide: getRepositoryToken(VendorApplication), useValue: { count: jest.fn().mockResolvedValue(0) } },
        { provide: AuthService, useValue: { revokeAllForUser: jest.fn().mockResolvedValue(1) } },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(1), logAdminResolution: jest.fn() } },
        { provide: OrdersService, useValue: {} },
        { provide: FulfillmentService, useValue: {} },
      ],
    }).compile();
    const svc = module.get(AdminService);
    const res = await svc.unlinkUser('v1', 'u1', 'c4');
    expect(res.transitioned).toBe(true);
  });
});
