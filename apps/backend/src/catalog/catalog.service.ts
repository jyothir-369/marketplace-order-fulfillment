import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { Category } from '../common/entities/category.entity';
import { Vendor } from '../common/entities/vendor.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  CatalogQueryDto,
  CatalogListResponseDto,
  CatalogFacetsDto,
  CategorySummaryDto,
  VendorDirectoryDto,
  CatalogSort,
} from './dto/catalog.dto';

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

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async createProduct(dto: CreateProductDto, correlationId: string): Promise<ProductResponseDto> {
    this.logger.log('Creating product: ' + dto.name, CatalogService.name, correlationId);

    const vendor = await this.vendorRepository.findOne({ where: { id: dto.vendorId } });
    if (!vendor) {
      throw new NotFoundException('Vendor with ID ' + dto.vendorId + ' not found');
    }

    const product = this.productRepository.create({
      vendorId: dto.vendorId,
      name: dto.name,
      slug: dto.slug ?? this.slugify(dto.name),
      category: dto.category ?? null,
      price: dto.price,
      stockCount: dto.stockCount,
      isActive: true,
    });

    const saved = await this.productRepository.save(product);
    this.logger.log('Product created: ' + saved.id, CatalogService.name, correlationId);

    return this.toResponseDto(saved, vendor.name);
  }

  async updateProduct(id: string, dto: UpdateProductDto, correlationId: string): Promise<ProductResponseDto> {
    this.logger.log('Updating product: ' + id, CatalogService.name, correlationId);

    const product = await this.productRepository.findOne({
      where: { id },
      relations: { vendor: true },
    });

    if (!product) {
      throw new NotFoundException('Product with ID ' + id + ' not found');
    }

    if (dto.name !== undefined) { product.name = dto.name; }
    if (dto.slug !== undefined) { product.slug = dto.slug; }
    if (dto.category !== undefined) { product.category = dto.category; }
    if (dto.price !== undefined) { product.price = dto.price; }
    if (dto.stockCount !== undefined) { product.stockCount = dto.stockCount; }
    if (dto.isActive !== undefined) { product.isActive = dto.isActive; }

    const saved = await this.productRepository.save(product);
    this.logger.log('Product updated: ' + id, CatalogService.name, correlationId);

    return this.toResponseDto(saved as unknown as Product, saved.vendor ? saved.vendor.name : 'Unknown');
  }

  /**
   * Soft-delete: deactivates the product so it stays referentially safe with
   * existing order_line_items. `GET /catalog?vendor=&includeInactive=true`
   * still surfaces it to admin/inventory surfaces.
   */
  async deleteProduct(id: string, correlationId: string): Promise<{ message: string }> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product with ID ' + id + ' not found');
    }
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
      description: (product as any).description ?? null,
      images: (product as any).images ?? null,
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