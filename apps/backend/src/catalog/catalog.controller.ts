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
  CreateCategoryDto,
  CreateVendorDto,
  VendorDetailDto,
  VendorDashboardDto,
} from './dto/catalog.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../common/entities/user.entity';
import type { AuthenticatedUser } from '../auth/auth.types';

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

  // Admin: categories + vendors (Phase 1.5). Static paths precede :id so the
  // param route can never swallow them.

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategorySummaryDto> {
    return this.catalogService.createCategory(dto);
  }

  @Post('vendors')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createVendor(@Body() dto: CreateVendorDto): Promise<VendorDetailDto> {
    return this.catalogService.createVendor(dto);
  }

  /** ADMIN: all vendors with operational product metrics. */
  @Get('vendors/admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getVendorsAdmin(): Promise<VendorDetailDto[]> {
    return this.catalogService.getVendorsAdmin();
  }

  /** Admin/vendor: operational detail for ONE vendor (own-vendor only for VENDOR). */
  @Get('vendor/:vendorId/detail')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.OPERATIONS)
  async getVendorDetail(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VendorDetailDto> {
    this.assertVendorScoped(vendorId, user);
    return this.catalogService.getVendorDetail(vendorId);
  }

  /** Vendor-portal aggregate metrics (own-vendor only for VENDOR). */
  @Get('vendor/:vendorId/dashboard')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.OPERATIONS)
  async getVendorDashboard(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VendorDashboardDto> {
    this.assertVendorScoped(vendorId, user);
    return this.catalogService.getVendorDashboard(vendorId);
  }

  @Get('vendor/:vendorId')
  async getProductsByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('includeInactive') includeInactive: string,
  ): Promise<ProductResponseDto[]> {
    const activeOnly = includeInactive !== 'true';
    return this.catalogService.findByVendor(vendorId, activeOnly);
  }

  // Static/literal routes MUST precede :id — Express matches in declaration
  // order, so autocomplete must sit above the :id param route or ParseUUIDPipe
  // would 400 any /catalog/autocomplete request (Phase 1.4).
  @Get('autocomplete')
  async autocomplete(@Query('q') q?: string): Promise<{ products: string[]; vendors: string[]; categories: string[] }> {
    // Lightweight search over product names + vendor names + categories
    const qb = this.catalogService['productRepository'].createQueryBuilder('p');
    if (q) {
      qb.andWhere('p.name ILIKE :q OR p.slug ILIKE :q', { q: `%${q}%` });
    }
    qb.select('p.name').limit(5);
    const products = (await qb.getRawMany()).map((r: { name: string }) => r.name);

    const cats = await this.catalogService.getCategories();
    const categories = cats.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5).map((c) => c.name);

    return { products, vendors: [], categories };
  }

  /** VENDORs may only read their own tenant; ADMIN/OPERATIONS see everything. */
  private assertVendorScoped(vendorId: string, user: AuthenticatedUser): void {
    if (user.role === UserRole.VENDOR && user.vendorId !== vendorId) {
      throw new ForbiddenException('You do not have access to this vendor');
    }
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    // Phase 3.1: the service forces VENDOR creators onto their own tenant.
    return this.catalogService.createProduct(dto, correlationId, user);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CorrelationId() correlationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    return this.catalogService.updateProduct(id, dto, correlationId, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async deleteProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.catalogService.deleteProduct(id, correlationId, user);
  }
} /* close class */
