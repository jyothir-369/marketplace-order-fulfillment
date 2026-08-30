import { CatalogService } from './catalog.service';
import { CreateProductDto, ProductResponseDto } from './dto/catalog.dto';
export declare class CatalogController {
    private readonly catalogService;
    constructor(catalogService: CatalogService);
    getCatalog(includeInactive: string): Promise<ProductResponseDto[]>;
    getProduct(id: string): Promise<ProductResponseDto>;
    getProductsByVendor(vendorId: string, includeInactive: string): Promise<ProductResponseDto[]>;
    createProduct(dto: CreateProductDto, correlationId: string): Promise<ProductResponseDto>;
}
