import { Repository } from 'typeorm';
import { Product } from '../common/entities/product.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto/catalog.dto';
export declare class CatalogService {
    private readonly productRepository;
    private readonly vendorRepository;
    private readonly logger;
    constructor(productRepository: Repository<Product>, vendorRepository: Repository<Vendor>);
    createProduct(dto: CreateProductDto, correlationId: string): Promise<ProductResponseDto>;
    findAll(activeOnly?: boolean): Promise<ProductResponseDto[]>;
    findById(id: string): Promise<ProductResponseDto>;
    findByVendor(vendorId: string, activeOnly?: boolean): Promise<ProductResponseDto[]>;
    updateProduct(id: string, dto: UpdateProductDto, correlationId: string): Promise<ProductResponseDto>;
    private toResponseDto;
}
