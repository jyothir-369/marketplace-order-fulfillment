<<<<<<< HEAD
import { Injectable, NotFoundException, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
=======
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
>>>>>>> origin/main
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

<<<<<<< HEAD
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

=======
>>>>>>> origin/main
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
      isActive: true,
    });

    const saved = await this.productRepository.save(product);
    this.logger.log('Product created: ' + saved.id, CatalogService.name, correlationId);

    return this.toResponseDto(saved, vendor.name);
  }

  async findAll(activeOnly = true): Promise<ProductResponseDto[]> {
    const where = activeOnly ? { isActive: true } : {};
    const relations: FindOptionsRelations<Product> = { vendor: true };
    const products = await this.productRepository.find({
      where: where as any,
      relations: relations,
      order: { createdAt: 'DESC' },
    });

    return products.map((p) => this.toResponseDto(p, p.vendor ? p.vendor.name : 'Unknown'));
  }

  async findById(id: string): Promise<ProductResponseDto> {
    const relations: FindOptionsRelations<Product> = { vendor: true };
    const product = await this.productRepository.findOne({
      where: { id },
      relations: relations,
    });

    if (!product) {
      throw new NotFoundException('Product with ID ' + id + ' not found');
    }

    return this.toResponseDto(product as any, product.vendor ? product.vendor.name : 'Unknown');
  }

  async findByVendor(vendorId: string, activeOnly = true): Promise<ProductResponseDto[]> {
    const where: any = activeOnly ? { vendorId, isActive: true } : { vendorId };
    const relations: FindOptionsRelations<Product> = { vendor: true };
    const products = await this.productRepository.find({
      where: where,
      relations: relations,
      order: { createdAt: 'DESC' },
    });

    return products.map((p) => this.toResponseDto(p, p.vendor ? p.vendor.name : 'Unknown'));
  }

  async updateProduct(id: string, dto: UpdateProductDto, correlationId: string): Promise<ProductResponseDto> {
    this.logger.log('Updating product: ' + id, CatalogService.name, correlationId);

    const relations: FindOptionsRelations<Product> = { vendor: true };
    const product = await this.productRepository.findOne({
      where: { id },
      relations: relations,
    });

    if (!product) {
      throw new NotFoundException('Product with ID ' + id + ' not found');
    }

    if (dto.name) { product.name = dto.name; }
    if (dto.price !== undefined) { product.price = dto.price; }
    if (dto.stockCount !== undefined) { product.stockCount = dto.stockCount; }
    if (dto.isActive !== undefined) { product.isActive = dto.isActive; }

    const saved = await this.productRepository.save(product);
    this.logger.log('Product updated: ' + id, CatalogService.name, correlationId);

    return this.toResponseDto(saved as any, saved.vendor ? saved.vendor.name : 'Unknown');
  }

<<<<<<< HEAD
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

=======
>>>>>>> origin/main
  private toResponseDto(product: Product, vendorName: string): ProductResponseDto {
    return {
      id: product.id,
      vendorId: product.vendorId,
      vendorName: vendorName,
      name: product.name,
      price: Number(product.price),
      stockCount: product.stockCount,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
<<<<<<< HEAD

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
=======
>>>>>>> origin/main
}