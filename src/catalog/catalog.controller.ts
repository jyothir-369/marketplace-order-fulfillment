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
  VendorDetailDto,
  CategorySummaryDto,
  CreateVendorDto,
  CreateCategoryDto,
  VendorDashboardDto,
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
   *   - category=<name>              (optional)
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
   * Public buyer-facing vendor directory (only vendors with products).
   */
  @Get('vendors')
  async getVendors(): Promise<VendorResponseDto[]> {
    return this.catalogService.findAllVendors();
  }

  /**
   * GET /api/catalog/vendors/admin
   *
   * Admin-only: returns every vendor including those with zero products.
   * NOTE: declared BEFORE the :id route so "admin" is not parsed as UUID.
   */
  @Get('vendors/admin')
  async getVendorsAdmin(): Promise<VendorDetailDto[]> {
    return this.catalogService.findAllVendorsAdmin();
  }

  /**
   * POST /api/catalog/vendors
   *
   * Admin-only: vendor onboarding.
   */
  @Post('vendors')
  @HttpCode(HttpStatus.CREATED)
  async createVendor(
    @Body() dto: CreateVendorDto,
    @CorrelationId() correlationId: string,
  ): Promise<VendorDetailDto> {
    return this.catalogService.createVendor(dto, correlationId);
  }

  @Get(':id')
  async getProduct(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.catalogService.findById(id);
  }

  /**
   * GET /api/catalog/vendor/:vendorId
   *
   * Products belonging to a specific vendor.
   */
  @Get('vendor/:vendorId')
  async getProductsByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('includeInactive') includeInactive: string,
  ): Promise<ProductResponseDto[]> {
    const activeOnly = includeInactive !== 'true';
    return this.catalogService.findByVendor(vendorId, activeOnly);
  }

  /**
   * GET /api/catalog/vendor/:vendorId/detail
   *
   * Admin-facing single vendor with operational metrics.
   */
  @Get('vendor/:vendorId/detail')
  async getVendorDetail(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<VendorDetailDto> {
    return this.catalogService.findVendorDetail(vendorId);
  }

  /**
   * GET /api/catalog/vendor/:vendorId/dashboard
   *
   * Vendor portal dashboard: product counts, stock levels, sync job queues.
   */
  @Get('vendor/:vendorId/dashboard')
  async getVendorDashboard(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<VendorDashboardDto> {
    return this.catalogService.getVendorDashboard(vendorId);
  }

  /**
   * GET /api/catalog/categories
   *
   * Returns a summary of every category present on at least one product.
   */
  @Get('categories')
  async getCategories(): Promise<CategorySummaryDto[]> {
    return this.catalogService.findAllCategories();
  }

  /**
   * POST /api/catalog/categories
   *
   * Admin-only: registers a new category name (idempotent).
   */
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategorySummaryDto> {
    return this.catalogService.createCategory(dto);
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
