import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  VendorResponseDto,
} from './dto/catalog.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * GET /api/catalog
   *
   * Query params:
   *   - includeInactive=true|false (default: false)
   *   - category=<name>            (optional)
   */
  @Get()
  async getCatalog(
    @Query('includeInactive') includeInactive: string,
    @Query('category') category: string,
  ): Promise<ProductResponseDto[]> {
    const activeOnly = includeInactive !== 'true';
    return this.catalogService.findAll(activeOnly, category);
  }

  /**
   * GET /api/catalog/vendors
   *
   * Lists all vendors with their product counts.
   * NOTE: defined BEFORE the `:id` route so Nest doesn't parse
   * "vendors" as a UUID parameter.
   */
  @Get('vendors')
  async getVendors(): Promise<VendorResponseDto[]> {
    return this.catalogService.findAllVendors();
  }

  @Get(':id')
  async getProduct(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.catalogService.findById(id);
  }

  @Get('vendor/:vendorId')
  async getProductsByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('includeInactive') includeInactive: string,
  ): Promise<ProductResponseDto[]> {
    const activeOnly = includeInactive !== 'true';
    return this.catalogService.findByVendor(vendorId, activeOnly);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body() dto: CreateProductDto,
    @CorrelationId() correlationId: string,
  ): Promise<ProductResponseDto> {
    return this.catalogService.createProduct(dto, correlationId);
  }

  @Patch(':id')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CorrelationId() correlationId: string,
  ): Promise<ProductResponseDto> {
    return this.catalogService.updateProduct(id, dto, correlationId);
  }

  /**
   * POST /api/catalog/seed
   * Seeds the database with sample products across 5 vendors and 4 categories.
   * Returns HTTP 201 Created.
   */
  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  async seedCatalog(
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string; productsCreated: number; vendorsCreated: number }> {
    const result = await this.catalogService.seedSampleProducts(correlationId);
    return result;
  }
}
