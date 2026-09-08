import { Injectable, NotFoundException, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations, In } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { Vendor } from '../common/entities/vendor.entity';
import {
  SyncJobStatus,
  VendorSyncJob,
} from '../common/entities/vendor-sync-job.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  VendorResponseDto,
  VendorDetailDto,
  CategorySummaryDto,
  CreateVendorDto,
  CreateCategoryDto,
  VendorDashboardDto,
} from './dto/catalog.dto';

interface VendorSeed {
  name: string;
  category: string;
  products: Array<{ name: string; price: number; stockCount: number }>;
}

const SAMPLE_CATALOG: VendorSeed[] = [
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
    category: 'Home & Living',
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
    category: 'Apparel',
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
    name: 'BuildMaster Tools',
    category: 'Industrial',
    products: [
      { name: 'Cordless Drill', price: 129.99, stockCount: 40 },
      { name: 'Circular Saw', price: 89.99, stockCount: 30 },
      { name: 'Workbench', price: 199.99, stockCount: 20 },
      { name: 'Tool Set 100pc', price: 79.99, stockCount: 60 },
      { name: 'Safety Goggles', price: 14.99, stockCount: 150 },
    ],
  },
];

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(VendorSyncJob)
    private readonly syncJobRepository: Repository<VendorSyncJob>,
    @InjectRepository(OrderLineItem)
    private readonly lineItemRepository: Repository<OrderLineItem>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Auto-seed the catalog so products appear in the storefront immediately,
    // without requiring a manual seed step. Only runs when the products table
    // is empty, and never deletes existing data.
    try {
      const count = await this.productRepository.count();
      if (count > 0) return;

      const sampleCatalog: Array<{ name: string; category: string; products: Array<{ name: string; price: number; stockCount: number }> }> = [
        { name: 'Electronics World', category: 'Electronics', products: [
            { name: 'Wireless Headphones', price: 79.99, stockCount: 50 },
            { name: 'Bluetooth Speaker', price: 49.99, stockCount: 100 },
            { name: 'USB-C Hub', price: 39.99, stockCount: 75 },
            { name: 'Mechanical Keyboard', price: 129.99, stockCount: 30 },
            { name: 'Gaming Mouse', price: 59.99, stockCount: 60 },
        ] },
        { name: 'Home & Kitchen Co', category: 'Home & Living', products: [
            { name: 'Coffee Maker', price: 89.99, stockCount: 40 },
            { name: 'Air Fryer', price: 149.99, stockCount: 25 },
            { name: 'Blender Pro', price: 69.99, stockCount: 55 },
        ] },
        { name: 'Sports Gear Inc', category: 'Apparel', products: [
            { name: 'Yoga Mat Premium', price: 34.99, stockCount: 120 },
            { name: 'Resistance Bands', price: 19.99, stockCount: 200 },
            { name: 'Running Shoes', price: 119.99, stockCount: 40 },
        ] },
        { name: 'Fashion Forward', category: 'Apparel', products: [
            { name: 'Cotton T-Shirt', price: 24.99, stockCount: 500 },
            { name: 'Denim Jeans', price: 59.99, stockCount: 200 },
            { name: 'Wool Sweater', price: 89.99, stockCount: 75 },
        ] },
        { name: 'BuildMaster Tools', category: 'Industrial', products: [
            { name: 'Cordless Drill', price: 129.99, stockCount: 40 },
            { name: 'Circular Saw', price: 89.99, stockCount: 30 },
            { name: 'Tool Set 100pc', price: 79.99, stockCount: 60 },
        ] },
      ];

      this.logger.log('Catalog is empty - seeding sample catalog', CatalogService.name);
      let productsCreated = 0;
      let vendorsCreated = 0;
      for (const vendorSeed of sampleCatalog) {
        const vendor = this.vendorRepository.create({ name: vendorSeed.name });
        const savedVendor = await this.vendorRepository.save(vendor);
        vendorsCreated++;

        for (const productSeed of vendorSeed.products) {
          const product = this.productRepository.create({
            vendorId: savedVendor.id,
            name: productSeed.name,
            price: productSeed.price,
            stockCount: productSeed.stockCount,
            category: vendorSeed.category,
            isActive: true,
          });
          await this.productRepository.save(product);
          productsCreated++;
        }
      }
      this.logger.log(
        'Auto-seeded catalog: ' + vendorsCreated + ' vendors, ' + productsCreated + ' products',
        CatalogService.name,
      );
    } catch (error) {
      this.logger.warn(
        'Auto-seed skipped: ' + (error instanceof Error ? error.message : String(error)),
        CatalogService.name,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Products
  // -----------------------------------------------------------------------

  async createProduct(dto: CreateProductDto, correlationId: string): Promise<ProductResponseDto> {
    this.logger.log('Creating product: ' + dto.name, CatalogService.name, correlationId);

    const vendor = await this.vendorRepository.findOne({ where: { id: dto.vendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor with ID ' + dto.vendorId + ' not found');
    }

    const product = this.productRepository.create({
      vendorId: dto.vendorId,
      name: dto.name,
      price: dto.price,
      stockCount: dto.stockCount,
      category: dto.category ?? null,
      isActive: true,
    });

    const saved = await this.productRepository.save(product);
    this.logger.log('Product created: ' + saved.id, CatalogService.name, correlationId);

    return this.toResponseDto(saved, vendor.name);
  }

  async findAll(activeOnly = true, category?: string): Promise<ProductResponseDto[]> {
    const where: any = activeOnly ? { isActive: true } : {};
    if (category) {
      where.category = category;
    }
    const relations: FindOptionsRelations<Product> = { vendor: true };
    const products = await this.productRepository.find({
      where: where,
      relations: relations,
      order: { createdAt: 'DESC' },
    });
    return products.map((p) => this.toResponseDto(p, p.vendor?.name ?? 'Unknown'));
  }

  async findById(id: string): Promise<ProductResponseDto> {
    const relations: FindOptionsRelations<Product> = { vendor: true };
    const product = await this.productRepository.findOne({
      where: { id },
      relations: relations,
    });
    if (!product) {
      throw new NotFoundException('Product ' + id + ' not found');
    }
    return this.toResponseDto(product, product.vendor?.name ?? 'Unknown');
  }

  async findByVendor(vendorId: string, activeOnly = true): Promise<ProductResponseDto[]> {
    const where: any = { vendorId };
    if (activeOnly) {
      where.isActive = true;
    }
    const relations: FindOptionsRelations<Product> = { vendor: true };
    const products = await this.productRepository.find({
      where: where,
      relations: relations,
      order: { createdAt: 'DESC' },
    });
    return products.map((p) => this.toResponseDto(p, p.vendor?.name ?? 'Unknown'));
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    correlationId: string,
  ): Promise<ProductResponseDto> {
    const existing = await this.productRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Product ' + id + ' not found');
    }

    if (dto.name !== undefined) existing.name = dto.name;
    if (dto.price !== undefined) existing.price = dto.price;
    if (dto.stockCount !== undefined) existing.stockCount = dto.stockCount;
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;
    if (dto.category !== undefined) existing.category = dto.category ?? null;

    const saved = await this.productRepository.save(existing);
    this.logger.log('Updated product: ' + id, CatalogService.name, correlationId);

    const vendor = await this.vendorRepository.findOne({ where: { id: saved.vendorId } });
    return this.toResponseDto(saved, vendor?.name ?? 'Unknown');
  }

  // -----------------------------------------------------------------------
  // Vendors (directory + admin onboarding)
  // -----------------------------------------------------------------------

  async findAllVendors(): Promise<VendorResponseDto[]> {
    const relations: FindOptionsRelations<Vendor> = { products: true };
    const vendors = await this.vendorRepository.find({
      relations: relations,
      order: { name: 'ASC' },
    });

    return vendors
      .filter((v) => v.products && v.products.length > 0)
      .map((v) => ({
        id: v.id,
        name: v.name,
        productCount: v.products.length,
        activeProductCount: v.products.filter((p) => p.isActive).length,
        createdAt: v.createdAt,
      }));
  }

  /**
   * Admin-facing: returns *every* vendor including those with zero products.
   * Ordered most-recently-created first.
   */
  async findAllVendorsAdmin(): Promise<VendorDetailDto[]> {
    const relations: FindOptionsRelations<Vendor> = { products: true };
    const vendors = await this.vendorRepository.find({
      relations: relations,
      order: { createdAt: 'DESC' },
    });

    return vendors.map((v) => this.toVendorDetail(v));
  }

  async findVendorDetail(vendorId: string): Promise<VendorDetailDto> {
    const relations: FindOptionsRelations<Vendor> = { products: true };
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: relations,
    });
    if (!vendor) {
      throw new NotFoundException('Vendor ' + vendorId + ' not found');
    }
    return this.toVendorDetail(vendor);
  }

  /**
   * Admin-facing vendor creation. Enforces uniqueness on vendor name (case-insensitive).
   */
  async createVendor(dto: CreateVendorDto, correlationId: string): Promise<VendorDetailDto> {
    this.logger.log('Creating vendor: ' + dto.name, CatalogService.name, correlationId);

    const trimmed = dto.name.trim();
    const existing = await this.vendorRepository
      .createQueryBuilder('vendor')
      .where('LOWER(vendor.name) = LOWER(:name)', { name: trimmed })
      .getOne();

    if (existing) {
      throw new ConflictException('Vendor "' + trimmed + '" already exists');
    }

    const vendor = this.vendorRepository.create({ name: trimmed });
    const saved = await this.vendorRepository.save(vendor);
    this.logger.log('Vendor created: ' + saved.id, CatalogService.name, correlationId);

    return this.toVendorDetail(saved);
  }

  // -----------------------------------------------------------------------
  // Category analytics (Phase 3 � admin surface)
  // -----------------------------------------------------------------------

  async findAllCategories(): Promise<CategorySummaryDto[]> {
    const products = await this.productRepository.find();

    const map = new Map<string, CategorySummaryDto>();
    for (const p of products) {
      if (!p.category) continue;
      const cat = p.category;
      const existing = map.get(cat);
      if (existing) {
        existing.productCount += 1;
        if (p.isActive) existing.activeProductCount += 1;
        existing.totalStock += p.stockCount;
      } else {
        map.set(cat, {
          name: cat,
          productCount: 1,
          activeProductCount: p.isActive ? 1 : 0,
          totalStock: p.stockCount,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createCategory(dto: CreateCategoryDto): Promise<CategorySummaryDto> {
    const name = dto.name.trim();
    const products = await this.productRepository.find({ where: { category: name } });

    return {
      name,
      productCount: products.length,
      activeProductCount: products.filter((p) => p.isActive).length,
      totalStock: products.reduce((sum, p) => sum + p.stockCount, 0),
    };
  }

  // -----------------------------------------------------------------------
  // Vendor dashboard metrics (Phase 3)
  // -----------------------------------------------------------------------

  async getVendorDashboard(vendorId: string): Promise<VendorDashboardDto> {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor ' + vendorId + ' not found');
    }

    const products = await this.productRepository.find({ where: { vendorId } });
    const activeProducts = products.filter((p) => p.isActive);
    const totalStock = products.reduce((sum, p) => sum + p.stockCount, 0);
    const lowStockCount = products.filter((p) => p.stockCount > 0 && p.stockCount <= 5).length;
    const outOfStockCount = products.filter((p) => p.stockCount === 0).length;

    const openStatuses = [
      FulfillmentStatus.PENDING,
      FulfillmentStatus.SYNCING,
      FulfillmentStatus.CONFIRMED,
      FulfillmentStatus.AMBIGUOUS,
    ];
    const openOrders = await this.lineItemRepository.count({
      where: { vendorId, fulfillmentStatus: In(openStatuses) },
    });

    const pendingStatuses = [SyncJobStatus.PENDING, SyncJobStatus.IN_PROGRESS];
    const deadLetterStatuses = [SyncJobStatus.DEAD_LETTER];
    const ambiguousStatuses = [SyncJobStatus.AMBIGUOUS];

    const [pendingSyncJobs, deadLetterJobs, ambiguousJobs] = await Promise.all([
      this.syncJobRepository.count({
        where: { status: In(pendingStatuses) as any },
      }),
      this.syncJobRepository.count({
        where: { status: In(deadLetterStatuses) as any },
      }),
      this.syncJobRepository.count({
        where: { status: In(ambiguousStatuses) as any },
      }),
    ]);

    return {
      vendorId,
      vendorName: vendor.name,
      productCount: products.length,
      activeProductCount: activeProducts.length,
      totalStock,
      lowStockCount,
      outOfStockCount,
      pendingSyncJobs,
      deadLetterJobs,
      ambiguousJobs,
      openOrders,
    };
  }

  // -----------------------------------------------------------------------
  // Seeding (idempotent � clears then reseeds)
  // -----------------------------------------------------------------------

  async seedSampleProducts(
    correlationId: string,
  ): Promise<{ message: string; productsCreated: number; vendorsCreated: number }> {
    this.logger.log('Seeding sample catalog', CatalogService.name, correlationId);

    await this.productRepository.createQueryBuilder().delete().execute();
    await this.vendorRepository.createQueryBuilder().delete().execute();

    let productsCreated = 0;
    let vendorsCreated = 0;
    for (const vendorSeed of SAMPLE_CATALOG) {
      const vendor = this.vendorRepository.create({ name: vendorSeed.name });
      const savedVendor = await this.vendorRepository.save(vendor);
      vendorsCreated++;

      for (const productSeed of vendorSeed.products) {
        const product = this.productRepository.create({
          vendorId: savedVendor.id,
          name: productSeed.name,
          price: productSeed.price,
          stockCount: productSeed.stockCount,
          category: vendorSeed.category,
          isActive: true,
        });
        await this.productRepository.save(product);
        productsCreated++;
      }
    }

    this.logger.log(
      'Sample catalog seeded: ' + vendorsCreated + ' vendors, ' + productsCreated + ' products',
      CatalogService.name,
      correlationId,
    );

    return {
      message: 'Sample catalog seeded',
      productsCreated,
      vendorsCreated,
    };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private toResponseDto(product: Product, vendorName: string): ProductResponseDto {
    return {
      id: product.id,
      vendorId: product.vendorId,
      vendorName: vendorName,
      name: product.name,
      price: Number(product.price),
      stockCount: product.stockCount,
      category: product.category ?? null,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private toVendorDetail(v: Vendor): VendorDetailDto {
    const products = v.products || [];
    const totalStock = products.reduce((sum, p) => sum + p.stockCount, 0);
    const outOfStock = products.filter((p) => p.stockCount === 0).length;
    const lowStock = products.filter((p) => p.stockCount > 0 && p.stockCount <= 5).length;
    return {
      id: v.id,
      name: v.name,
      productCount: products.length,
      activeProductCount: products.filter((p) => p.isActive).length,
      totalStock,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      createdAt: v.createdAt,
    };
  }
}