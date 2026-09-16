import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, OptimisticLockVersionMismatchError } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { Category } from '../common/entities/category.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { UserRole } from '../common/entities/user.entity';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  CatalogQueryDto,
  CatalogListResponseDto,
  CatalogFacetsDto,
  CategorySummaryDto,
  VendorDirectoryDto,
  CreateCategoryDto,
  CreateVendorDto,
  VendorDetailDto,
  VendorDashboardDto,
  CatalogSort,
} from './dto/catalog.dto';

/** Operational product aggregates for a single vendor (admin + dashboard). */
interface ProductStats {
  productCount: number;
  activeProductCount: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

/**
 * Catalog service (Phase 2 — categories + catalog contract).
 *
 * Adds server-side querying (`query()`) with filters/sort/pagination/facets on
 * top of the Phase 0 CRUD, plus the category registry, buyer vendor directory,
 * soft-delete, and a guarded catalog seeder.
 */
@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  /** Matches the vendor inventory page: 1..5 units counts as "low stock". */
  private readonly LOW_STOCK_THRESHOLD = 5;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(OrderLineItem)
    private readonly lineItemRepository: Repository<OrderLineItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async createProduct(
    dto: CreateProductDto,
    correlationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    this.logger.log('Creating product: ' + dto.name, CatalogService.name, correlationId);

    // Phase 3.1: a VENDOR may only create products under their own tenant —
    // the client-supplied vendorId is ignored for vendors (no cross-tenant writes).
    const effectiveVendorId =
      currentUser.role === UserRole.VENDOR ? currentUser.vendorId : dto.vendorId;
    if (!effectiveVendorId) {
      throw new ForbiddenException('A vendor account must be linked to a vendor to create products');
    }

    const vendor = await this.vendorRepository.findOne({ where: { id: effectiveVendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor with ID ' + effectiveVendorId + ' not found');
    }

    const product = this.productRepository.create({
      vendorId: effectiveVendorId,
      name: dto.name,
      slug: dto.slug ?? this.slugify(dto.name),
      category: dto.category ?? null,
      price: dto.price,
      stockCount: dto.stockCount,
      isActive: true,
      description: dto.description ?? null,
      images: dto.images ?? null,
    });

    const saved = await this.productRepository.save(product);
    this.logger.log('Product created: ' + saved.id, CatalogService.name, correlationId);

    return this.toResponseDto(saved, vendor.name);
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    correlationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    this.logger.log('Updating product: ' + id, CatalogService.name, correlationId);

    const product = await this.productRepository.findOne({
      where: { id },
      relations: { vendor: true },
    });

    if (!product) {
      throw new NotFoundException('Product with ID ' + id + ' not found');
    }

    // Phase 3.1: VENDORs may only modify their own products.
    this.assertVendorOwnsProduct(product.vendorId, currentUser);

    if (dto.name !== undefined) { product.name = dto.name; }
    if (dto.slug !== undefined) { product.slug = dto.slug; }
    if (dto.category !== undefined) { product.category = dto.category; }
    if (dto.price !== undefined) { product.price = dto.price; }
    if (dto.stockCount !== undefined) { product.stockCount = dto.stockCount; }
    if (dto.isActive !== undefined) { product.isActive = dto.isActive; }
    if (dto.description !== undefined) { product.description = dto.description; }
    if (dto.images !== undefined) { product.images = dto.images; }

    // Phase 2.5: `save()` with a @VersionColumn throws
    // OptimisticLockVersionMismatchError on concurrent edits — surface it as a
    // 409 Conflict instead of an unstyled 500 so the UI can prompt a refresh.
    let saved: Product;
    try {
      saved = (await this.productRepository.save(product)) as Product;
    } catch (err) {
      if (err instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('This product was modified by someone else. Please refresh and try again.');
      }
      throw err;
    }

    this.logger.log('Product updated: ' + id, CatalogService.name, correlationId);

    return this.toResponseDto(saved, saved.vendor ? saved.vendor.name : 'Unknown');
  }

  /**
   * Soft-delete: deactivates the product so it stays referentially safe with
   * existing order_line_items. `GET /catalog?vendor=&includeInactive=true`
   * still surfaces it to admin/inventory surfaces.
   */
  async deleteProduct(
    id: string,
    correlationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product with ID ' + id + ' not found');
    }
    // Phase 3.1: VENDORs may only deactivate their own products.
    this.assertVendorOwnsProduct(product.vendorId, currentUser);
    await this.productRepository.update(id, { isActive: false });
    this.logger.log('Product deactivated (soft delete): ' + id, CatalogService.name, correlationId);
    return { message: 'Product deactivated' };
  }

  async findById(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { vendor: true },
    });

    if (!product) {
      throw new NotFoundException('Product with ID ' + id + ' not found');
    }

    return this.toResponseDto(product, product.vendor ? product.vendor.name : 'Unknown');
  }

  /** Unpaged array of a single vendor's products (vendor storefront / inventory). */
  async findByVendor(vendorId: string, activeOnly = true): Promise<ProductResponseDto[]> {
    const where = activeOnly ? { vendorId, isActive: true } : { vendorId };
    const products = await this.productRepository.find({
      where,
      relations: { vendor: true },
      order: { createdAt: 'DESC' },
    });

    return products.map((p) => this.toResponseDto(p, p.vendor ? p.vendor.name : 'Unknown'));
  }

  /** Unpaged array of all products (legacy callers: deals, vendor detail). */
  async findAll(activeOnly = true): Promise<ProductResponseDto[]> {
    const where = activeOnly ? { isActive: true } : {};
    const products = await this.productRepository.find({
      where,
      relations: { vendor: true },
      order: { createdAt: 'DESC' },
    });

    return products.map((p) => this.toResponseDto(p, p.vendor ? p.vendor.name : 'Unknown'));
  }

  // ---------------------------------------------------------------------------
  // Server-side query (filters + sort + pagination + facets)
  // ---------------------------------------------------------------------------

  async query(dto: CatalogQueryDto): Promise<CatalogListResponseDto> {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.vendor', 'vendor');

    if (!dto.includeInactive) {
      qb.andWhere('product.isActive = :isActive', { isActive: true });
    }
    if (dto.q) {
      qb.andWhere('(product.name ILIKE :q OR product.slug ILIKE :q)', { q: `%${dto.q}%` });
    }
    if (dto.category) {
      qb.andWhere('product.category = :category', { category: dto.category });
    }
    if (dto.vendor) {
      qb.andWhere('product.vendorId = :vendor', { vendor: dto.vendor });
    }
    if (dto.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    const facets = await this.buildFacets(dto);
    this.applySort(qb, dto.sort);

    const page = Math.max(1, dto.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, dto.pageSize ?? 24));
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items.map((p) => this.toResponseDto(p, p.vendor ? p.vendor.name : 'Unknown')),
      total,
      page,
      pageSize,
      totalPages,
      facets,
    };
  }

  private applySort(qb: SelectQueryBuilder<Product>, sort?: CatalogSort): void {
    switch (sort) {
      case CatalogSort.PRICE_ASC:
        qb.orderBy('product.price', 'ASC');
        break;
      case CatalogSort.PRICE_DESC:
        qb.orderBy('product.price', 'DESC');
        break;
      case CatalogSort.NAME_ASC:
        qb.orderBy('product.name', 'ASC');
        break;
      case CatalogSort.NAME_DESC:
        qb.orderBy('product.name', 'DESC');
        break;
      case CatalogSort.NEWEST:
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }
  }

  /**
   * Facet counts over the BASE filter — q, vendor, price — deliberately EXCLUDING
   * `category` so the tab strip stays live while browsing a single category, and
   * excluding the pagination slice so counts reflect the whole matching set.
   */
  private async buildFacets(dto: CatalogQueryDto): Promise<CatalogFacetsDto> {
    const base = this.productRepository.createQueryBuilder('product');
    if (!dto.includeInactive) {
      base.andWhere('product.isActive = :isActive', { isActive: true });
    }
    if (dto.q) {
      base.andWhere('(product.name ILIKE :q OR product.slug ILIKE :q)', { q: `%${dto.q}%` });
    }
    if (dto.vendor) {
      base.andWhere('product.vendorId = :vendor', { vendor: dto.vendor });
    }
    if (dto.minPrice !== undefined) {
      base.andWhere('product.price >= :minPrice', { minPrice: dto.minPrice });
    }
    if (dto.maxPrice !== undefined) {
      base.andWhere('product.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    const [total, priceRange] = await Promise.all([
      base.clone().getCount(),
      base
        .clone()
        .select('MIN(product.price)', 'min')
        .addSelect('MAX(product.price)', 'max')
        .getRawOne(),
    ]);

    const rows = await base
      .clone()
      .select('product.category', 'category')
      .addSelect('category.slug', 'slug')
      .leftJoin(Category, 'category', 'category.name = product.category')
      .addSelect('COUNT(product.id)', 'productCount')
      .addSelect('SUM(CASE WHEN product.isActive = TRUE THEN 1 ELSE 0 END)', 'activeCount')
      .addSelect('SUM(product.stockCount)', 'totalStock')
      .andWhere('product.category IS NOT NULL')
      .groupBy('product.category')
      .addGroupBy('category.slug')
      .getRawMany();

    const categories: CategorySummaryDto[] = rows
      .filter((r) => r && r.category)
      .map((r) => ({
        name: String(r.category),
        slug: r.slug ? String(r.slug) : null,
        productCount: Number(r.productCount ?? 0),
        activeProductCount: Number(r.activeCount ?? 0),
        totalStock: Number(r.totalStock ?? 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      categories,
      totalProducts: total,
      minPrice: Number(priceRange?.min ?? 0),
      maxPrice: Number(priceRange?.max ?? 0),
    };
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  /** Category registry with live product counts (admin + storefront tabs). */
  async getCategories(): Promise<CategorySummaryDto[]> {
    const rows = await this.productRepository
      .createQueryBuilder('product')
      .select('product.category', 'category')
      .addSelect('category.slug', 'slug')
      .leftJoin(Category, 'category', 'category.name = product.category')
      .addSelect('COUNT(product.id)', 'productCount')
      .addSelect('SUM(CASE WHEN product.isActive = TRUE THEN 1 ELSE 0 END)', 'activeCount')
      .addSelect('SUM(product.stockCount)', 'totalStock')
      .andWhere('product.category IS NOT NULL')
      .groupBy('product.category')
      .addGroupBy('category.slug')
      .orderBy('product.category', 'ASC')
      .getRawMany();

    return rows
      .filter((r) => r && r.category)
      .map((r) => ({
        name: String(r.category),
        slug: r.slug ? String(r.slug) : null,
        productCount: Number(r.productCount ?? 0),
        activeProductCount: Number(r.activeCount ?? 0),
        totalStock: Number(r.totalStock ?? 0),
      }));
  }

  // ---------------------------------------------------------------------------
  // Vendor directory (buyer-side)
  // ---------------------------------------------------------------------------

  async getVendorsDirectory(): Promise<VendorDirectoryDto[]> {
    const rows = await this.vendorRepository
      .createQueryBuilder('vendor')
      .leftJoin(Product, 'product', 'product.vendorId = vendor.id')
      .select('vendor.id', 'id')
      .addSelect('vendor.name', 'name')
      .addSelect('MIN(vendor.createdAt)', 'createdAt')
      .addSelect('COUNT(product.id)', 'productCount')
      .addSelect('SUM(CASE WHEN product.isActive = TRUE THEN 1 ELSE 0 END)', 'activeCount')
      .groupBy('vendor.id')
      .addGroupBy('vendor.name')
      .orderBy('vendor.name', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      productCount: Number(r.productCount ?? 0),
      activeProductCount: Number(r.activeCount ?? 0),
      createdAt: new Date(r.createdAt),
    }));
  }

  // ---------------------------------------------------------------------------
  // Admin: categories + vendors, vendor detail/dashboard (Phase 1.5)
  // ---------------------------------------------------------------------------

  private readonly ZERO_STATS: ProductStats = {
    productCount: 0,
    activeProductCount: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  /** Per-vendor product aggregates (counts, stock, low/out-of-stock). */
  private async getProductStatsByVendor(): Promise<Map<string, ProductStats>> {
    const rows = await this.productRepository
      .createQueryBuilder('product')
      .select('product.vendorId', 'vendorId')
      .addSelect('COUNT(product.id)', 'productCount')
      .addSelect('SUM(CASE WHEN product.isActive = TRUE THEN 1 ELSE 0 END)', 'activeCount')
      .addSelect('COALESCE(SUM(product.stockCount), 0)', 'totalStock')
      .addSelect(
        'SUM(CASE WHEN product.stockCount > 0 AND product.stockCount <= :lowThreshold THEN 1 ELSE 0 END)',
        'lowStock',
      )
      .addSelect('SUM(CASE WHEN product.stockCount = 0 THEN 1 ELSE 0 END)', 'outOfStock')
      .setParameter('lowThreshold', this.LOW_STOCK_THRESHOLD)
      .groupBy('product.vendorId')
      .getRawMany();

    const map = new Map<string, ProductStats>();
    for (const r of rows) {
      map.set(String(r.vendorId), {
        productCount: Number(r.productCount ?? 0),
        activeProductCount: Number(r.activeCount ?? 0),
        totalStock: Number(r.totalStock ?? 0),
        lowStockCount: Number(r.lowStock ?? 0),
        outOfStockCount: Number(r.outOfStock ?? 0),
      });
    }
    return map;
  }

  async createCategory(dto: CreateCategoryDto): Promise<CategorySummaryDto> {
    const existing = await this.categoryRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException('Category ' + dto.name + ' already exists');
    }

    const saved = await this.categoryRepository.save(
      this.categoryRepository.create({
        name: dto.name,
        slug: dto.slug ?? this.slugify(dto.name),
        description: dto.description ?? null,
      }),
    );

    this.logger.log('Category created: ' + saved.name + ' (slug: ' + saved.slug + ')', CatalogService.name);
    return {
      name: saved.name,
      slug: saved.slug,
      productCount: 0,
      activeProductCount: 0,
      totalStock: 0,
    };
  }

  async createVendor(dto: CreateVendorDto): Promise<VendorDetailDto> {
    const vendor = await this.vendorRepository.save(this.vendorRepository.create({ name: dto.name }));
    this.logger.log('Vendor created: ' + vendor.name + ' (' + vendor.id + ')', CatalogService.name);
    return this.toVendorDetailDto(vendor, await this.getProductStatsByVendor());
  }

  /** ADMIN: all vendors with operational product metrics (Phase 1.5). */
  async getVendorsAdmin(): Promise<VendorDetailDto[]> {
    const vendors = await this.vendorRepository.find({ order: { name: 'ASC' } });
    const stats = await this.getProductStatsByVendor();
    return vendors.map((v) => this.toVendorDetailDto(v, stats));
  }

  async getVendorDetail(vendorId: string): Promise<VendorDetailDto> {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor with ID ' + vendorId + ' not found');
    }
    return this.toVendorDetailDto(vendor, await this.getProductStatsByVendor());
  }

  /** Vendor-portal aggregate metrics: products + fulfillment + open orders. */
  async getVendorDashboard(vendorId: string): Promise<VendorDashboardDto> {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor with ID ' + vendorId + ' not found');
    }

    const [stats, fulfillment, openOrders] = await Promise.all([
      this.getProductStatsByVendor(),
      this.getVendorFulfillmentCounts(vendorId),
      this.countVendorOpenOrders(vendorId),
    ]);

    const s = stats.get(vendorId) ?? this.ZERO_STATS;
    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      productCount: s.productCount,
      activeProductCount: s.activeProductCount,
      totalStock: s.totalStock,
      lowStockCount: s.lowStockCount,
      outOfStockCount: s.outOfStockCount,
      pendingSyncJobs: fulfillment.pending,
      deadLetterJobs: fulfillment.deadLetter,
      ambiguousJobs: fulfillment.ambiguous,
      openOrders,
    };
  }

  private toVendorDetailDto(vendor: Vendor, stats: Map<string, ProductStats>): VendorDetailDto {
    const s = stats.get(vendor.id) ?? this.ZERO_STATS;
    return {
      id: vendor.id,
      name: vendor.name,
      productCount: s.productCount,
      activeProductCount: s.activeProductCount,
      totalStock: s.totalStock,
      lowStockCount: s.lowStockCount,
      outOfStockCount: s.outOfStockCount,
      createdAt: vendor.createdAt,
    };
  }

  /** Fulfillment-state counts for a vendor's line items (drives the queue stats). */
  private async getVendorFulfillmentCounts(vendorId: string): Promise<{ pending: number; deadLetter: number; ambiguous: number }> {
    const row = await this.lineItemRepository
      .createQueryBuilder('line_item')
      .select("SUM(CASE WHEN line_item.fulfillment_status IN ('pending', 'syncing') THEN 1 ELSE 0 END)", 'pending')
      .select("SUM(CASE WHEN line_item.fulfillment_status = 'dead_letter' THEN 1 ELSE 0 END)", 'dead')
      .select("SUM(CASE WHEN line_item.fulfillment_status = 'ambiguous' THEN 1 ELSE 0 END)", 'amb')
      .where('line_item.vendor_id = :vendorId', { vendorId })
      .groupBy('line_item.vendor_id')
      .getRawOne();

    return {
      pending: Number(row?.pending ?? 0),
      deadLetter: Number(row?.dead ?? 0),
      ambiguous: Number(row?.amb ?? 0),
    };
  }

  /** Distinct non-terminal orders containing at least one line item from this vendor. */
  private async countVendorOpenOrders(vendorId: string): Promise<number> {
    const row = await this.lineItemRepository
      .createQueryBuilder('line_item')
      .leftJoin(Order, 'o', 'o.id = line_item.order_id')
      .select('COUNT(DISTINCT line_item.order_id)', 'openOrders')
      .where('line_item.vendor_id = :vendorId', { vendorId })
      .andWhere("o.status NOT IN ('cancelled', 'fulfilled')")
      .getRawOne();

    return Number(row?.openOrders ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Seeder (guarded — POST /catalog/seed, ADMIN only)
  // ---------------------------------------------------------------------------

  /**
   * Idempotent catalog seeder used by demos / load tests: upserts the default
   * categories and, when the catalog is empty, provisions 5 demo vendors each
   * with 5 products carrying category + slug.
   */
  async seedCatalog(correlationId: string): Promise<{ message: string; vendorsCreated: number; productsCreated: number; categoriesCreated: number }> {
    this.logger.log('Seeding catalog', CatalogService.name, correlationId);

    const defaultCategories = [
      { name: 'Electronics', slug: 'electronics', description: 'Gadgets, devices, and accessories' },
      { name: 'Apparel', slug: 'apparel', description: 'Clothing, shoes, and fashion accessories' },
      { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Furniture, appliances, and home goods' },
      { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Fitness gear and outdoor equipment' },
      { name: 'Books & Media', slug: 'books-media', description: 'Books, music, and digital media' },
    ];

    let categoriesCreated = 0;
    for (const c of defaultCategories) {
      const existing = await this.categoryRepository.findOne({ where: { name: c.name } });
      if (!existing) {
        await this.categoryRepository.save(this.categoryRepository.create(c));
        categoriesCreated++;
      }
    }

    const existingProductCount = await this.productRepository.count();
    if (existingProductCount > 0) {
      return {
        message: 'Catalog already seeded; categories were ensured.',
        vendorsCreated: 0,
        productsCreated: 0,
        categoriesCreated,
      };
    }

    const vendorSeeds: Array<{ name: string; category: string; products: Array<{ name: string; price: number; stockCount: number }> }> = [
      {
        name: 'Electronics World',
        category: 'Electronics',
        products: [
          { name: 'Wireless Headphones', price: 79.99, stockCount: 50 },
          { name: 'Bluetooth Speaker', price: 49.99, stockCount: 100 },
          { name: 'USB-C Hub', price: 39.99, stockCount: 75 },
          { name: 'Mechanical Keyboard', price: 129.99, stockCount: 30 },
          { name: 'Gaming Mouse', price: 59.99, stockCount: 60 },
        ],
      },
      {
        name: 'Home & Kitchen Co',
        category: 'Home & Kitchen',
        products: [
          { name: 'Coffee Maker', price: 89.99, stockCount: 40 },
          { name: 'Air Fryer', price: 149.99, stockCount: 25 },
          { name: 'Blender Pro', price: 69.99, stockCount: 55 },
          { name: 'Instant Pot', price: 99.99, stockCount: 35 },
          { name: 'Knife Set', price: 79.99, stockCount: 45 },
        ],
      },
      {
        name: 'Sports Gear Inc',
        category: 'Sports & Outdoors',
        products: [
          { name: 'Yoga Mat Premium', price: 34.99, stockCount: 120 },
          { name: 'Resistance Bands', price: 19.99, stockCount: 200 },
          { name: 'Dumbbell Set 20lb', price: 49.99, stockCount: 80 },
          { name: 'Running Shoes', price: 119.99, stockCount: 40 },
          { name: 'Water Bottle', price: 24.99, stockCount: 150 },
        ],
      },
      {
        name: 'Fashion Forward',
        category: 'Apparel',
        products: [
          { name: 'Cotton T-Shirt', price: 24.99, stockCount: 500 },
          { name: 'Denim Jeans', price: 59.99, stockCount: 200 },
          { name: 'Leather Belt', price: 34.99, stockCount: 150 },
          { name: 'Sneakers Classic', price: 79.99, stockCount: 100 },
          { name: 'Wool Sweater', price: 89.99, stockCount: 75 },
        ],
      },
      {
        name: 'Books & Media',
        category: 'Books & Media',
        products: [
          { name: 'Bestseller Novel', price: 14.99, stockCount: 300 },
          { name: 'Cookbook Collection', price: 29.99, stockCount: 100 },
          { name: 'Programming Guide', price: 49.99, stockCount: 80 },
          { name: 'Art Print A4', price: 19.99, stockCount: 200 },
          { name: 'Board Game', price: 39.99, stockCount: 60 },
        ],
      },
    ];

    let vendorsCreated = 0;
    let productsCreated = 0;
    for (const vendorSeed of vendorSeeds) {
      const vendor = await this.vendorRepository.save(
        this.vendorRepository.create({ name: vendorSeed.name }),
      );
      vendorsCreated++;

      for (const productSeed of vendorSeed.products) {
        await this.productRepository.save(
          this.productRepository.create({
            vendorId: vendor.id,
            name: productSeed.name,
            slug: this.slugify(productSeed.name) + '-' + Math.random().toString(36).slice(2, 8),
            category: vendorSeed.category,
            price: productSeed.price,
            stockCount: productSeed.stockCount,
            isActive: true,
          }),
        );
        productsCreated++;
      }
    }

    this.logger.log('Catalog seeded: ' + productsCreated + ' products across ' + vendorsCreated + ' vendors', CatalogService.name, correlationId);
    return {
      message: 'Catalog seeded successfully',
      vendorsCreated,
      productsCreated,
      categoriesCreated,
    };
  }

  // ---------------------------------------------------------------------------
  // Tenant authorization (Phase 3.1)
  // ---------------------------------------------------------------------------

  /**
   * A VENDOR may only write to products under their own vendor tenant.
   * ADMIN/OPERATIONS bypass ownership (ADMIN is already the only non-vendor
   * role allowed on these write routes, so this in practice only gates vendors).
   */
  private assertVendorOwnsProduct(vendorId: string, currentUser: AuthenticatedUser): void {
    if (currentUser.role === UserRole.VENDOR && currentUser.vendorId !== vendorId) {
      throw new ForbiddenException('You do not own this product');
    }
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  private toResponseDto(product: Product, vendorName: string): ProductResponseDto {
    return {
      id: product.id,
      vendorId: product.vendorId,
      vendorName: vendorName,
      name: product.name,
      slug: product.slug ?? null,
      category: product.category ?? null,
      price: Number(product.price),
      stockCount: product.stockCount,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // Phase 2.3: real entity columns — no more phantom `as any` reads.
      description: product.description ?? null,
      images: product.images ?? null,
    };
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}