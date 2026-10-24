import { IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
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
  totalRevenue: number;
  pendingOrders: number;
  fulfillingOrders: number;
  fulfilledOrders: number;
  cancelledOrders: number;
  deadLetterJobs: number;
  ambiguousJobs: number;
}

export class AdminAnalyticsDto {
  window: { start: string; end: string; timezone: string };
  throughput: Array<{ date: string; placed: number; fulfilling: number; fulfilled: number; cancelled: number }>;
  latency: { computedFrom: string; unit: string; averageMs: number | null; count: number; note: string };
  sources: string[];
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

export class StuckOrderDto {
  orderId: string;
  buyerId: string;
  status: string;
  createdAt: Date;
  stuckReason: string;
  stuckLineItems: StuckOrderLineItemDto[];
}

export class AdminOrderListDto {
  total: number;
  orders: Array<{ orderId: string; buyerId: string; status: string; createdAt: Date; lineItems: any[]; stuckReason?: string }>;
}

export class StuckOrdersResponseDto {
  total: number;
  orders: StuckOrderDto[];
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
export class LinkUserDto {
  @IsString()
  email: string;
}

export class LinkedUserDto {
  id: string;
  email: string;
  role: string;
  vendorId: string | null;
}
