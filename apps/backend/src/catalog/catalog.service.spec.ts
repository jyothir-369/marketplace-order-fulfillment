import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, OptimisticLockVersionMismatchError } from 'typeorm';
import { CatalogService } from './catalog.service';
import { Product } from '../common/entities/product.entity';
import { Category } from '../common/entities/category.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { UserRole } from '../common/entities/user.entity';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CatalogQueryDto, CatalogSort } from './dto/catalog.dto';

// ---------------------------------------------------------------------------
// Helpers to build lightweight SelectQueryBuilder mocks
// ---------------------------------------------------------------------------
function mockQb() {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ min: null, max: null }),
    getRawMany: jest.fn().mockResolvedValue([]),
    clone: jest.fn().mockReturnThis(),
  };
  return qb;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    vendorId: '00000000-0000-0000-0000-000000000099',
    name: 'Test Product',
    slug: 'test-product',
    category: 'Electronics',
    price: 49.99,
    stockCount: 100,
    isActive: true,
    version: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    vendor: { id: '00000000-0000-0000-0000-000000000099', name: 'Vendor A', createdAt: new Date(), updatedAt: new Date(), products: [] } as any,
    categoryRelation: null as any,
    orderLineItems: [],
    ...overrides,
  } as Product;
}

/** ADMINS bypass ownership checks (Phase 3.1). */
function adminUser(): AuthenticatedUser {
  return { id: 'u-admin', email: 'admin@marketplace.dev', role: UserRole.ADMIN, vendorId: null };
}

/** A vendor tenant user, scoped to their own vendorId (Phase 3.1). */
function vendorUser(vendorId: string): AuthenticatedUser {
  return { id: 'u-vendor', email: 'vendor@marketplace.dev', role: UserRole.VENDOR, vendorId };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CatalogService', () => {
  let service: CatalogService;
  let productRepo: any;
  let vendorRepo: any;
  let categoryRepo: any;
  let qb: any;

  beforeEach(async () => {
    qb = mockQb();

    productRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      create: jest.fn().mockImplementation((d) => d as Product),
      save: jest.fn().mockImplementation(async (p) => ({ ...p, id: 'saved-id' })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    vendorRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb()),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    categoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    // Phase 1.5: new admin/dashboard endpoints query line items + orders.
    const lineItemRepo = { createQueryBuilder: jest.fn().mockReturnValue(mockQb()) };
    const orderRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Vendor), useValue: vendorRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(OrderLineItem), useValue: lineItemRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
      ],
    }).compile();

    service = module.get(CatalogService);
  });

  // ---------------------------------------------------------------------------
  // query() — filters
  // ---------------------------------------------------------------------------

  describe('query()', () => {
    it('returns default page 1 with no filters', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      // buildFacets calls clone().getCount() and clone().getRawOne() and
      // another clone() chain for category rows — all on the same qb mock
      // which returns `this`, so chained calls work.

      const result = await service.query({});

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(24);
      expect(result.items).toEqual([]);
    });

    it('applies ILIKE search filter for `q`', async () => {
      await service.query({ q: 'head' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ q: '%head%' }),
      );
    });

    it('applies category filter', async () => {
      await service.query({ category: 'Electronics' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('product.category = :category'),
        { category: 'Electronics' },
      );
    });

    it('applies vendor filter', async () => {
      const vendorId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      await service.query({ vendor: vendorId });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('product.vendorId = :vendor'),
        { vendor: vendorId },
      );
    });

    it('applies min/max price filters', async () => {
      await service.query({ minPrice: 10, maxPrice: 100 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('product.price >= :minPrice'),
        { minPrice: 10 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('product.price <= :maxPrice'),
        { maxPrice: 100 },
      );
    });

    it('excludes inactive products by default', async () => {
      await service.query({});

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('product.isActive = :isActive'),
        { isActive: true },
      );
    });

    it('skips isActive filter when includeInactive is true', async () => {
      await service.query({ includeInactive: true });

      const isActiveCalls = qb.andWhere.mock.calls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('isActive'),
      );
      expect(isActiveCalls).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // query() — sort
  // ---------------------------------------------------------------------------

  describe('query() sort', () => {
    it('sorts by newest (default)', async () => {
      await service.query({});

      expect(qb.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('sorts by price ascending', async () => {
      await service.query({ sort: CatalogSort.PRICE_ASC });

      expect(qb.orderBy).toHaveBeenCalledWith('product.price', 'ASC');
    });

    it('sorts by name descending', async () => {
      await service.query({ sort: CatalogSort.NAME_DESC });

      expect(qb.orderBy).toHaveBeenCalledWith('product.name', 'DESC');
    });
  });

  // ---------------------------------------------------------------------------
  // query() — pagination
  // ---------------------------------------------------------------------------

  describe('query() pagination', () => {
    it('applies skip/take for page 2 with pageSize 12', async () => {
      await service.query({ page: 2, pageSize: 12 });

      expect(qb.skip).toHaveBeenCalledWith(12);
      expect(qb.take).toHaveBeenCalledWith(12);
    });

    it('clamps page below 1 to page 1', async () => {
      const result = await service.query({ page: -5 });

      expect(result.page).toBe(1);
      expect(qb.skip).toHaveBeenCalledWith(0);
    });

    it('clamps pageSize above 100 to 100', async () => {
      const result = await service.query({ pageSize: 999 });

      expect(result.pageSize).toBe(100);
      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });

  // ---------------------------------------------------------------------------
  // query() — response shape
  // ---------------------------------------------------------------------------

  describe('query() response shape', () => {
    it('maps product entities to ProductResponseDto', async () => {
      const p = makeProduct({ name: 'Widget', slug: 'widget', category: 'Electronics', price: 29.99 });
      qb.getManyAndCount.mockResolvedValue([[p], 1]);

      const result = await service.query({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Widget');
      expect(result.items[0].slug).toBe('widget');
      expect(result.items[0].category).toBe('Electronics');
      expect(result.total).toBe(1);
    });

    it('computes totalPages correctly', async () => {
      qb.getManyAndCount.mockResolvedValue([Array(25).fill(makeProduct()), 50]);

      const result = await service.query({ pageSize: 24 });

      expect(result.totalPages).toBe(Math.ceil(50 / 24));
    });
  });

  // ---------------------------------------------------------------------------
  // deleteProduct()
  // ---------------------------------------------------------------------------

  describe('deleteProduct()', () => {
    it('soft-deletes an existing product', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());

      const result = await service.deleteProduct('id-1', 'corr-1', adminUser());

      expect(result).toEqual({ message: 'Product deactivated' });
      expect(productRepo.update).toHaveBeenCalledWith('id-1', { isActive: false });
    });

    it('throws NotFoundException for unknown product', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteProduct('nope', 'corr-1', adminUser())).rejects.toThrow('not found');
    });

    it('forbids a VENDOR deactivating another vendor\'s product (Phase 3.1)', async () => {
      // makeProduct() vendorId is ...099; the caller owns ...123.
      productRepo.findOne.mockResolvedValue(makeProduct());

      await expect(
        service.deleteProduct('id-1', 'corr-1', vendorUser('00000000-0000-0000-0000-000000000123')),
      ).rejects.toThrow('You do not own this product');
      expect(productRepo.update).not.toHaveBeenCalled();
    });

    it('allows a VENDOR deactivating their own product (Phase 3.1)', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());

      const result = await service.deleteProduct(
        'id-1',
        'corr-1',
        vendorUser('00000000-0000-0000-0000-000000000099'),
      );

      expect(result).toEqual({ message: 'Product deactivated' });
      expect(productRepo.update).toHaveBeenCalledWith('id-1', { isActive: false });
    });
  });

  // ---------------------------------------------------------------------------
  // updateProduct()
  // ---------------------------------------------------------------------------

  describe('updateProduct()', () => {
    it('applies provided fields and returns the updated product', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      productRepo.save.mockImplementation(async (p) => ({ ...p, version: 2 }));

      const result = await service.updateProduct(
        'id-1',
        { name: 'Renamed', price: 59.99, description: 'New blurb', images: ['img1.jpg'] },
        'corr-1',
        adminUser(),
      );

      expect(result.name).toBe('Renamed');
      expect(result.price).toBe(59.99);
      expect(result.description).toBe('New blurb');
      expect(result.images).toEqual(['img1.jpg']);
      // save() receives the mutated entity including description/images (2.3).
      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'New blurb', images: ['img1.jpg'] }),
      );
    });

    it('throws NotFoundException for unknown product', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.updateProduct('nope', { name: 'X' }, 'corr-1', adminUser())).rejects.toThrow('not found');
    });

    it('maps an optimistic lock mismatch to a 409 Conflict (Phase 2.5)', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      productRepo.save.mockRejectedValue(
        new OptimisticLockVersionMismatchError('Product', 1, 2),
      );

      await expect(
        service.updateProduct('id-1', { name: 'Concurrent edit' }, 'corr-1', adminUser()),
      ).rejects.toThrow('This product was modified by someone else. Please refresh and try again.');
    });

    it('rethrows non-version errors as-is', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      const dbError = new Error('connection dropped');
      productRepo.save.mockRejectedValue(dbError);

      await expect(
        service.updateProduct('id-1', { name: 'Broken' }, 'corr-1', adminUser()),
      ).rejects.toThrow('connection dropped');
    });

    it('forbids a VENDOR updating another vendor\'s product (Phase 3.1)', async () => {
      // makeProduct() vendorId is ...099; the caller owns ...123.
      productRepo.findOne.mockResolvedValue(makeProduct());

      await expect(
        service.updateProduct(
          'id-1',
          { name: 'Hijacked' },
          'corr-1',
          vendorUser('00000000-0000-0000-0000-000000000123'),
        ),
      ).rejects.toThrow('You do not own this product');
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('allows a VENDOR updating their own product (Phase 3.1)', async () => {
      productRepo.findOne.mockResolvedValue(makeProduct());
      productRepo.save.mockImplementation(async (p) => ({ ...p, version: 2 }));

      const result = await service.updateProduct(
        'id-1',
        { name: 'Own product edit' },
        'corr-1',
        vendorUser('00000000-0000-0000-0000-000000000099'),
      );

      expect(result.name).toBe('Own product edit');
    });
  });

  // ---------------------------------------------------------------------------
  // createProduct()
  // ---------------------------------------------------------------------------

  describe('createProduct()', () => {
    it('creates a product for an ADMIN under the supplied vendor', async () => {
      vendorRepo.findOne.mockResolvedValue({ id: 'v-1', name: 'Vendor A' });
      productRepo.save.mockImplementation(async (p) => ({ ...p, id: 'saved-id' }));

      const result = await service.createProduct(
        { vendorId: 'v-1', name: 'New Widget', price: 12.5, stockCount: 3, description: 'd', images: ['i.jpg'] },
        'corr-1',
        adminUser(),
      );

      expect(result.vendorName).toBe('Vendor A');
      expect(result.name).toBe('New Widget');
      expect(productRepo.create).toHaveBeenCalledWith(expect.objectContaining({ vendorId: 'v-1' }));
    });

    it('forces a VENDOR creator onto their own tenant, ignoring dto.vendorId (Phase 3.1)', async () => {
      const ownVendorId = '00000000-0000-0000-0000-000000000099';
      vendorRepo.findOne.mockResolvedValue({ id: ownVendorId, name: 'Own Vendor' });
      productRepo.save.mockImplementation(async (p) => ({ ...p, id: 'saved-id' }));

      await service.createProduct(
        { vendorId: 'v-other', name: 'Sneaky', price: 10, stockCount: 4 },
        'corr-1',
        vendorUser(ownVendorId),
      );

      // The vendor lookup + the created product both resolve to the CALLER'S
      // vendorId — a vendor can never write into another tenant.
      expect(vendorRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: ownVendorId } }),
      );
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ vendorId: ownVendorId }),
      );
    });

    it('forbids a VENDOR with no linked vendor from creating products (Phase 3.1)', async () => {
      await expect(
        service.createProduct(
          { vendorId: 'v-1', name: 'X', price: 1, stockCount: 1 },
          'corr-1',
          { id: 'u1', email: 'x@y.z', role: UserRole.VENDOR, vendorId: null },
        ),
      ).rejects.toThrow('must be linked to a vendor');
    });
  });

  // ---------------------------------------------------------------------------
  // getCategories()
  // ---------------------------------------------------------------------------

  describe('getCategories()', () => {
    it('returns category summaries from grouped query', async () => {
      const qb2 = mockQb();
      productRepo.createQueryBuilder.mockReturnValue(qb2);
      qb2.getRawMany.mockResolvedValue([
        { category: 'Electronics', slug: 'electronics', productCount: '5', activeCount: '5', totalStock: '300' },
        { category: 'Apparel', slug: 'apparel', productCount: '3', activeCount: '2', totalStock: '100' },
      ]);

      const categories = await service.getCategories();

      expect(categories).toHaveLength(2);
      // Returns in DB-provided order (mock returns as-inserted)
      expect(categories[0].name).toBe('Electronics');
      expect(categories[0].slug).toBe('electronics');
      expect(categories[0].productCount).toBe(5);
      expect(categories[0].totalStock).toBe(300);
      expect(categories[1].name).toBe('Apparel');
    });
  });

  // ---------------------------------------------------------------------------
  // getVendorsDirectory()
  // ---------------------------------------------------------------------------

  describe('getVendorsDirectory()', () => {
    it('returns vendor directory with product counts', async () => {
      const vendorQb = mockQb();
      vendorRepo.createQueryBuilder.mockReturnValue(vendorQb);
      vendorQb.getRawMany.mockResolvedValue([
        { id: 'v1', name: 'Acme', productCount: '10', activeCount: '8', createdAt: '2025-01-01T00:00:00Z' },
      ]);

      const vendors = await service.getVendorsDirectory();

      expect(vendors).toHaveLength(1);
      expect(vendors[0].name).toBe('Acme');
      expect(vendors[0].productCount).toBe(10);
      expect(vendors[0].createdAt).toBeInstanceOf(Date);
    });
  });
});
