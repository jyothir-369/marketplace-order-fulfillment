import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  CatalogQueryDto,
  CatalogListResponseDto,
  CategorySummaryDto,
  VendorDirectoryDto,
} from './dto/catalog.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * Server-side catalog query: `?q=&category=&vendor=&minPrice=&maxPrice=&sort=&page=&pageSize=`.
   * Public; returns a paged response with live facet counts (Phase 2).
   */
  @Get()
  async getCatalog(@Query() query: CatalogQueryDto): Promise<CatalogListResponseDto> {
    return this.catalogService.query(query);
  }

  /** Category registry with live product counts. */
  @Get('categories')
  async getCategories(): Promise<CategorySummaryDto[]> {
    return this.catalogService.getCategories();
  }

  /** Buyer-facing vendor directory. */
  @Get('vendors')
  async getVendors(): Promise<VendorDirectoryDto[]> {
    return this.catalogService.getVendorsDirectory();
  }

  @Get('vendor/:vendorId')
  async getProductsByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('includeInactive') includeInactive: string,
  ): Promise<ProductResponseDto[]> {
    const activeOnly = includeInactive !== 'true';
    return this.catalogService.findByVendor(vendorId, activeOnly);
  }

  @Get(':id')
  async getProduct(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.catalogService.findById(id);
  }

  /** Demo/load-test seeder — admin only. */
  @Post('seed')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async seedCatalog(@CorrelationId() correlationId: string) {
    return this.catalogService.seedCatalog(correlationId);
  }

  // Vendor-scoped writes: requiring an authenticated VENDOR or ADMIN stops
  // anonymous catalog mutation. (Phase 10 deepens scoping to the exact vendor.)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async createProduct(
    @Body() dto: CreateProductDto,
    @CorrelationId() correlationId: string,
  ): Promise<ProductResponseDto> {
    return this.catalogService.createProduct(dto, correlationId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CorrelationId() correlationId: string,
  ): Promise<ProductResponseDto> {
    return this.catalogService.updateProduct(id, dto, correlationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async deleteProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string }> {
    return this.catalogService.deleteProduct(id, correlationId);
  }
}