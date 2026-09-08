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
  CreateVendorDto,
  CategorySummaryDto,
  CreateCategoryDto,
  VendorDashboardDto,
} from './dto/catalog.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getCatalog(
    @Query('includeInactive') includeInactive: string,
    @Query('category') category: string,
  ): Promise<ProductResponseDto[]> {
    const activeOnly = includeInactive !== 'true';
    return this.catalogService.findAll(activeOnly, category || undefined);
  }

  // --- Vendors (must be before :id so 'vendors' is not parsed as a UUID) ---

  @Get('vendors')
  async getVendors(): Promise<VendorResponseDto[]> {
    return this.catalogService.findAllVendors();
  }

  @Get('vendors/admin')
  async getAdminVendors(): Promise<VendorDetailDto[]> {
    return this.catalogService.findAllVendorsAdmin();
  }

  @Post('vendors')
  @HttpCode(HttpStatus.CREATED)
  async createVendor(
    @Body() dto: CreateVendorDto,
    @CorrelationId() correlationId: string,
  ): Promise<VendorDetailDto> {
    return this.catalogService.createVendor(dto, correlationId);
  }

  @Get('vendor/:vendorId')
  async getProductsByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('includeInactive') includeInactive: string,
  ): Promise<ProductResponseDto[]> {
    const activeOnly = includeInactive !== 'true';
    return this.catalogService.findByVendor(vendorId, activeOnly);
  }

  @Get('vendor/:vendorId/detail')
  async getVendorDetail(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<VendorDetailDto> {
    return this.catalogService.findVendorDetail(vendorId);
  }

  @Get('vendor/:vendorId/dashboard')
  async getVendorDashboard(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<VendorDashboardDto> {
    return this.catalogService.getVendorDashboard(vendorId);
  }

  // --- Categories ---

  @Get('categories')
  async getCategories(): Promise<CategorySummaryDto[]> {
    return this.catalogService.findAllCategories();
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body() dto: CreateCategoryDto,
  ): Promise<CategorySummaryDto> {
    return this.catalogService.createCategory(dto);
  }

  // --- Seed ---

  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  async seedCatalog(
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string; productsCreated: number; vendorsCreated: number }> {
    return this.catalogService.seedSampleProducts(correlationId);
  }

  // --- Single product (must come after all literal path segments) ---

  @Get(':id')
  async getProduct(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.catalogService.findById(id);
  }

  @Patch(':id')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CorrelationId() correlationId: string,
  ): Promise<ProductResponseDto> {
    return this.catalogService.updateProduct(id, dto, correlationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body() dto: CreateProductDto,
    @CorrelationId() correlationId: string,
  ): Promise<ProductResponseDto> {
    return this.catalogService.createProduct(dto, correlationId);
  }
}
