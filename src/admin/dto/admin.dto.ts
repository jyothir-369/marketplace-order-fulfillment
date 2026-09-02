import { IsEnum, IsOptional, IsString, IsArray, ValidateNested, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { FulfillmentStatus, OrderStatus } from '../../common/entities';
import { VendorSyncJob, SyncJobStatus } from '../../common/entities/vendor-sync-job.entity';

export class AdminResolveDto {
  @IsEnum(FulfillmentStatus)
  newFulfillmentStatus: FulfillmentStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  vendorReference?: string;
}

export class AdminDashboardDto {
  totalOrders: number;
  pendingOrders: number;
  fulfillingOrders: number;
  fulfilledOrders: number;
  cancelledOrders: number;
  deadLetterJobs: number;
  ambiguousJobs: number;
}

export class StuckOrderLineItemDto {
  lineItemId: string;
  productId: string;
  vendorId: string;
  fulfillmentStatus: FulfillmentStatus;
  failureReason?: string;
  attempts: number;
  lastAttemptedAt?: Date;
}

export class AdminOrderFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsIn(['stuck', 'all'])
  type?: 'stuck' | 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AdminOrderDto {
  orderId: string;
  buyerId: string;
  status: string;
  createdAt: Date;
  lineItems: StuckOrderLineItemDto[];
  stuckReason?: string;
}

export class AdminOrderResponseDto {
  total: number;
  orders: AdminOrderDto[];
}

export class AdminAuditLogDto {
  id: string;
  correlationId: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class AdminAuditLogResponseDto {
  total: number;
  logs: AdminAuditLogDto[];
}