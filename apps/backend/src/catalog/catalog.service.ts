import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsRelations } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto/catalog.dto';

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
}