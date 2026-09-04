import { IsString, IsNumber, IsUUID, IsOptional, Min, MinLength } from 'class-validator';

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

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockCount?: number;

  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  category?: string;
}

export class ProductResponseDto {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  price: number;
  stockCount: number;
  category: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class VendorResponseDto {
  id: string;
  name: string;
  productCount: number;
  activeProductCount: number;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Admin-facing: vendor detail with operational metrics
// ---------------------------------------------------------------------------

export class VendorDetailDto {
  id: string;
  name: string;
  productCount: number;
  activeProductCount: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Admin-facing: create a new vendor (vendor onboarding)
// ---------------------------------------------------------------------------

export class CreateVendorDto {
  @IsString()
  @MinLength(2)
  name: string;
}

// ---------------------------------------------------------------------------
// Category management (Phase 3)
// ---------------------------------------------------------------------------

export class CategorySummaryDto {
  /** Slug / display name (e.g. "Electronics"). */
  name: string;
  productCount: number;
  activeProductCount: number;
  /** Sum of stockCount for all products in this category. */
  totalStock: number;
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  name: string;
}

// ---------------------------------------------------------------------------
// Vendor dashboard (Phase 3 — vendor portal)
// ---------------------------------------------------------------------------

import { SyncJobStatus } from '../../common/entities/vendor-sync-job.entity';

export class VendorDashboardDto {
  vendorId: string;
  vendorName: string;
  productCount: number;
  activeProductCount: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  /** Sync jobs currently in pending / in_progress for this vendor. */
  pendingSyncJobs: number;
  /** Sync jobs currently in dead_letter for this vendor. */
  deadLetterJobs: number;
  /** Sync jobs currently in ambiguous for this vendor. */
  ambiguousJobs: number;
  /** Open orders (non-terminal) for this vendor. */
  openOrders: number;
}
