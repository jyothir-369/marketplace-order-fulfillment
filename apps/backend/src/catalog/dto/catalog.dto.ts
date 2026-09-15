import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';

/** Coerce query-string numbers (`?page=2`) to `number` before validation. */
export function TypeNumeric(): PropertyDecorator {
  return Type(() => Number);
}

// ---------------------------------------------------------------------------
// Product writes
// ---------------------------------------------------------------------------

export class CreateProductDto {
  @IsUUID()
  vendorId: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stockCount: number;

  /** Category name (e.g. "Electronics"). Optional on create — falls back to none. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  /** URL-friendly slug. Derives from `name` when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockCount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;
}

// ---------------------------------------------------------------------------
// Catalog query (server-side filter/sort/paginate/facets)
// ---------------------------------------------------------------------------

export enum CatalogSort {
  NEWEST = 'newest',
  PRICE_ASC = 'price-asc',
  PRICE_DESC = 'price-desc',
  NAME_ASC = 'name-asc',
  NAME_DESC = 'name-desc',
}

export class CatalogQueryDto {
  /** Free-text search against product name + slug (case-insensitive). */
  @IsOptional()
  @IsString()
  q?: string;

  /** Exact category name. */
  @IsOptional()
  @IsString()
  category?: string;

  /** Vendor uuid. */
  @IsOptional()
  @IsUUID()
  vendor?: string;

  @IsOptional()
  @TypeNumeric()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @TypeNumeric()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(CatalogSort)
  sort?: CatalogSort;

  /** 1-indexed page. */
  @IsOptional()
  @TypeNumeric()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  /** Items per page (default 24, capped at 100). */
  @IsOptional()
  @TypeNumeric()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 24;

  /** Admin-only: include inactive products. */
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}

// ---------------------------------------------------------------------------
// Facets + list response
// ---------------------------------------------------------------------------

export class CategorySummaryDto {
  name: string;
  slug: string | null;
  productCount: number;
  activeProductCount: number;
  totalStock: number;
}

export class CatalogFacetsDto {
  /** Category counts over the base (non-category) filter — drives live tabs. */
  categories: CategorySummaryDto[];
  /** Total products matching the base filter (the "All" tab count). */
  totalProducts: number;
  /** Min/max unit price across the base set (price-range facet). */
  minPrice: number;
  maxPrice: number;
}

export class CatalogListResponseDto {
  items: ProductResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: CatalogFacetsDto;
}

// ---------------------------------------------------------------------------
// Vendor directory (buyer-facing)
// ---------------------------------------------------------------------------

export class VendorDirectoryDto {
  id: string;
  name: string;
  productCount: number;
  activeProductCount: number;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Product read
// ---------------------------------------------------------------------------

export class ProductResponseDto {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  slug: string | null;
  category: string | null;
  price: number;
  stockCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  description?: string | null;
  images?: string[] | null;
}