/**
 * lib/types.ts â€” DTO mirrors for the NestJS backend (Â§3.3).
 *
 * The frontend never speaks to the backend through untyped objects.
 * These interfaces MUST stay 1:1 with the backend DTOs â€” if a backend
 * field changes, the change must surface here as a compile error, not
 * as a runtime 500 (GAP-B10).
 */

// ---------------------------------------------------------------------------
// Generic primitives
// ---------------------------------------------------------------------------

export type Uuid = string;
export type IsoDateTime = string;
export type CorrelationId = string;

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface ProductDto {
  id: Uuid;
  name: string;
  price: number;
  stockCount: number;
  vendorId: Uuid;
  vendorName: string;
  /** Optional product category (e.g. Electronics, Apparel, Home & Living, Industrial). */
  category: string | null;
  isActive: boolean;
}

export interface CreateProductDto {
  vendorId: Uuid;
  name: string;
  price: number;
  stockCount: number;
  category?: string;
}

export interface UpdateStockDto {
  stockCount: number;
}

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "FULFILLING",
  "FULFILLED",
  "CANCELLED",
  "FAILED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderLineItemDto {
  id: Uuid;
  productId: Uuid;
  productName: string;
  vendorId: Uuid;
  vendorName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  fulfillmentStatus: string;
  vendorReference?: string;
  failureReason?: string;
}

export interface OrderResponseDto {
  id: Uuid;
  orderNumber?: string;
  buyerId: Uuid;
  status: OrderStatus;
  totalAmount: number;
  correlationId: CorrelationId;
  shippingAddress?: string;
  lineItems: OrderLineItemDto[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Checkout (GAP-B1 / GAP-F2)
// ---------------------------------------------------------------------------

export interface CheckoutLineItemDto {
  productId: Uuid;
  quantity: number;
}

export interface CheckoutDto {
  buyerId: Uuid;
  items: CheckoutLineItemDto[];
  shippingAddress: string;
  /** Optional client-generated idempotency key for safe retries. */
  idempotencyKey?: string;
}

export interface CheckoutResponseDto {
  success: boolean;
  order?: OrderResponseDto;
  message: string;
  correlationId: CorrelationId;
  /** Populated when success is false due to a stock conflict (HTTP 409). */
  conflictingProductIds?: Uuid[];
}

// ---------------------------------------------------------------------------
// Cancel & transition (admin / vendor)
// ---------------------------------------------------------------------------

export interface CancelOrderDto {
  reason?: string;
  actorUserId?: Uuid;
}

export type OrderTransitionAction = "CONFIRM" | "FULFILL" | "SHIP" | "CANCEL";

export interface TransitionOrderDto {
  action: OrderTransitionAction;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditLogEntryDto {
  id: Uuid;
  correlationId: CorrelationId;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  createdAt: IsoDateTime;
}

export interface AuditLogResponseDto {
  total: number;
  logs: AuditLogEntryDto[];
}

// ---------------------------------------------------------------------------
// Admin dashboard / orders / DLQ
// ---------------------------------------------------------------------------

export interface AdminDashboardDto {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  fulfilledOrders: number;
  cancelledOrders: number;
  deadLetterJobs: number;
  ambiguousJobs: number;
}

export interface AdminOrderLineItemDto {
  lineItemId: Uuid;
  productId: Uuid;
  vendorId: Uuid;
  fulfillmentStatus: string;
  failureReason?: string;
  attempts: number;
  lastAttemptedAt?: IsoDateTime | null;
}

export interface AdminOrderDto {
  orderId: Uuid;
  orderNumber?: string;
  buyerId: Uuid;
  status: string;
  createdAt: IsoDateTime;
  lineItems: AdminOrderLineItemDto[];
  stuckReason?: string;
}

export interface AdminOrderListDto {
  total: number;
  orders: AdminOrderDto[];
}

export interface AdminOrderFilterDto {
  status?: string;
  vendorId?: Uuid;
  type?: "stuck" | "all";
  limit?: number;
  offset?: number;
}

export interface AdminResolveLineItemDto {
  newFulfillmentStatus: string;
  reason?: string;
  vendorReference?: string;
}

// ---------------------------------------------------------------------------
// Dead-letter queue / sync jobs
// ---------------------------------------------------------------------------

export const SYNC_JOB_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "ambiguous",
  "dead_letter",
] as const;

export type SyncJobStatus = (typeof SYNC_JOB_STATUSES)[number];

export interface DeadLetterJobDto {
  id: Uuid;
  orderLineItemId: Uuid;
  status: SyncJobStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptedAt?: IsoDateTime | null;
  completedAt?: IsoDateTime | null;
  vendorResponse?: string | null;
  errorMessage?: string | null;
  correlationId?: CorrelationId | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthStatusDto {
  status: string;
  timestamp: IsoDateTime;
  uptime: number;
  database: { status: string; connected: boolean };
  memory: { used: number; total: number; percentage: number };
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

/** Backend-standardized error body (NestJS HttpException). */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  /** Optional conflict payload for 409s (e.g. oversell). */
  conflictingProductIds?: Uuid[];
}

// ---------------------------------------------------------------------------
// Audit (admin) â€” moved out from admin-specific section above for re-export
// ---------------------------------------------------------------------------

export interface AdminAuditLogDto {
  id: Uuid;
  correlationId: CorrelationId;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
}

export interface AdminAuditLogResponseDto {
  total: number;
  logs: AdminAuditLogDto[];
}

export interface AdminAuditLogFilterDto {
  correlationId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Vendor (buyer-side directory)
// ---------------------------------------------------------------------------

export interface VendorResponseDto {
  id: Uuid;
  name: string;
  productCount: number;
  activeProductCount: number;
  createdAt: IsoDateTime;
}
