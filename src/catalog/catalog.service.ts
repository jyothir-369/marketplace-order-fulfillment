import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto/catalog.dto';

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
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

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

    return this.toResponseDto(product, product.vendor ? product.vendor.name : 'Unknown');
  }

  async findByVendor(vendorId: string, activeOnly = true): Promise<ProductResponseDto[]> {
    const where: any = { vendorId };
    if (activeOnly) { where.isActive = true; }
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
    if (dto.category !== undefined) { product.category = dto.category ?? null; }

    const saved = await this.productRepository.save(product);
    this.logger.log('Product updated: ' + id, CatalogService.name, correlationId);

    return this.toResponseDto(saved, saved.vendor ? saved.vendor.name : 'Unknown');
  }

  /**
   * Seeds the database with 25 sample products across 5 vendors and 4 categories.
   * Clears existing catalog data first so the operation is idempotent.
   */
  async seedSampleProducts(
    correlationId: string,
  ): Promise<{ message: string; productsCreated: number; vendorsCreated: number }> {
    this.logger.log('Seeding sample catalog', CatalogService.name, correlationId);

    // Use QueryBuilder to bypass TypeORM 0.3 restriction on empty-criteria delete.
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
}
