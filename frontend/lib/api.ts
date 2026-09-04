/**
 * lib/api.ts — typed fetch client (§3.3)
 *
 * All HTTP calls go through this module. Types come from lib/types.ts.
 * GAP-B1 fix: checkoutOrder() targets POST /api/orders/checkout.
 */

import type {
  ApiErrorBody,
  CheckoutDto,
  CheckoutResponseDto,
  CreateProductDto,
  ProductDto,
  UpdateStockDto,
  OrderResponseDto,
  TransitionOrderDto,
  CancelOrderDto,
  AuditLogResponseDto,
  AdminDashboardDto,
  AdminOrderListDto,
  AdminResolveLineItemDto,
  DeadLetterJobDto,
  AdminAuditLogResponseDto,
  HealthStatusDto,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Client defaults
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001/api';

export const VENDOR_ID = "11111111-1111-1111-1111-111111111111";

// ---------------------------------------------------------------------------
// Fetch utility
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string | number | undefined> }
): Promise<T> {
  let url = `${BASE_URL}${path}`;

  if (init?.params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(init.params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const q = qs.toString();
    if (q) url += `?${q}`;
  }

  const { params: _params, ...fetchInit } = init ?? {};

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...fetchInit?.headers },
    ...fetchInit,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let body: ApiErrorBody | null = null;
    try {
      body = await res.json() as ApiErrorBody;
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
      }
    } catch {
      // non-JSON body
    }
    const err = new Error(message) as Error & { statusCode: number; body: ApiErrorBody | null };
    err.statusCode = res.status;
    err.body = body;
    throw err;
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Type guard — defensive parse of order responses (§6.2)
// ---------------------------------------------------------------------------

function parseOrder(order: unknown): OrderResponseDto {
  if (!order || typeof order !== "object") {
    throw new Error("Malformed order response: expected an object");
  }
  const o = order as Record<string, unknown>;
  if (typeof o.id !== "string") throw new Error("Malformed order: missing id");
  if (!Array.isArray(o.lineItems)) {
    (o as unknown as OrderResponseDto).lineItems = [];
  }
  return o as unknown as OrderResponseDto;
}

// ---------------------------------------------------------------------------
// Catalog / products
// ---------------------------------------------------------------------------

/** GET /api/catalog */
export async function getProducts(): Promise<ProductDto[]> {
  return apiFetch<ProductDto[]>("/catalog");
}

/** GET /api/catalog/:id */
export async function getProductById(id: string): Promise<ProductDto> {
  return apiFetch<ProductDto>(`/catalog/${id}`);
}

/** POST /api/catalog/seed */
export async function seedCatalog(): Promise<{
  message: string;
  productsCreated: number;
}> {
  return apiFetch<{ message: string; productsCreated: number }>("/catalog/seed", {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Checkout (GAP-B1 / GAP-F2)
// ---------------------------------------------------------------------------

/**
 * POST /api/orders/checkout
 *
 * GAP-B1 fix: called the wrong endpoint (was POST /orders).
 * Now targets the correct backend endpoint with CheckoutDto.
 */
export async function checkoutOrder(payload: CheckoutDto): Promise<CheckoutResponseDto> {
  const res = await apiFetch<CheckoutResponseDto>("/orders/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.order) {
    res.order = parseOrder(res.order);
  }
  return res;
}

/**
 * @deprecated Use checkoutOrder() — kept for backwards compat only.
 */
export const createOrder = checkoutOrder;

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** GET /api/orders/:id */
export async function getOrderById(id: string): Promise<OrderResponseDto> {
  return apiFetch<OrderResponseDto>(`/orders/${id}`).then(parseOrder);
}

/** POST /api/orders/:id/transition */
export async function transitionOrder(
  orderId: string,
  payload: TransitionOrderDto
): Promise<OrderResponseDto> {
  return apiFetch<OrderResponseDto>(`/orders/${orderId}/transition`, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(parseOrder);
}

/** POST /api/orders/:id/cancel */
export async function cancelOrder(
  orderId: string,
  payload: CancelOrderDto = {}
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/orders/:id/audit-logs */
export async function getOrderAuditLogs(
  orderId: string
): Promise<AuditLogResponseDto> {
  return apiFetch<AuditLogResponseDto>(`/orders/${orderId}/audit-logs`);
}

// ---------------------------------------------------------------------------
// Vendor catalog
// ---------------------------------------------------------------------------

/** GET /api/catalog/vendor/:vendorId */
export async function getVendorProducts(
  vendorId: string = VENDOR_ID,
  includeInactive = true
): Promise<ProductDto[]> {
  return apiFetch<ProductDto[]>(`/catalog/vendor/${vendorId}`, {
    params: includeInactive ? { includeInactive: "true" } : undefined,
  });
}

/** PATCH /api/catalog/:productId */
export async function updateStock(
  productId: string,
  payload: UpdateStockDto
): Promise<ProductDto> {
  return apiFetch<ProductDto>(`/catalog/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** POST /api/catalog */
export async function createProduct(
  payload: CreateProductDto
): Promise<ProductDto> {
  return apiFetch<ProductDto>("/catalog", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Vendor orders
// ---------------------------------------------------------------------------

/** GET /api/orders/vendor/:vendorId */
export async function getVendorOrders(
  vendorId: string = VENDOR_ID
): Promise<OrderResponseDto[]> {
  return apiFetch<OrderResponseDto[]>(`/orders/vendor/${vendorId}`);
}

// ---------------------------------------------------------------------------
// Dead-letter / sync jobs
// ---------------------------------------------------------------------------

/** GET /api/fulfillment/dead-letter (vendor-scoped) */
export async function getVendorDeadLetterJobs(): Promise<DeadLetterJobDto[]> {
  return apiFetch<DeadLetterJobDto[]>("/fulfillment/dead-letter");
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** GET /api/admin/dashboard */
export async function getAdminDashboard(): Promise<AdminDashboardDto> {
  return apiFetch<AdminDashboardDto>("/admin/dashboard");
}

/** GET /api/admin/orders */
export async function getAdminOrders(
  filter: {
    status?: string;
    vendorId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<AdminOrderListDto> {
  return apiFetch<AdminOrderListDto>("/admin/orders", {
    params: {
      status: filter.status,
      vendorId: filter.vendorId,
      type: filter.type,
      limit: filter.limit,
      offset: filter.offset,
    },
  });
}

/** POST /api/admin/line-items/:lineItemId/resolve */
export async function resolveLineItem(
  lineItemId: string,
  payload: AdminResolveLineItemDto
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/admin/line-items/${lineItemId}/resolve`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

/** POST /api/admin/orders/:orderId/cancel */
export async function cancelAdminOrder(
  orderId: string
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

/** GET /api/admin/dead-letter */
export async function getDeadLetterJobs(): Promise<DeadLetterJobDto[]> {
  return apiFetch<DeadLetterJobDto[]>("/admin/dead-letter");
}

/** POST /api/admin/dead-letter/:jobId/retry */
export async function retryDeadLetterJob(
  jobId: string
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/admin/dead-letter/${jobId}/retry`,
    { method: "POST" }
  );
}

/** GET /api/admin/audit-logs */
export async function getAuditLogs(
  filter: Record<string, string | number | undefined> = {}
): Promise<AdminAuditLogResponseDto> {
  return apiFetch<AdminAuditLogResponseDto>("/admin/audit-logs", {
    params: filter,
  });
}

/** GET /api/admin/trace/:correlationId */
export async function getCorrelationTrace(
  correlationId: string
): Promise<AdminAuditLogResponseDto> {
  return apiFetch<AdminAuditLogResponseDto>(
    `/admin/trace/${correlationId}`
  );
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

/** GET /api/health */
export async function getHealth(): Promise<HealthStatusDto> {
  return apiFetch<HealthStatusDto>("/health");
}

// ---------------------------------------------------------------------------
// Backwards-compat re-exports of DTO names used by existing pages.
// These alias the types from lib/types.ts so pages don'"'"'t need updating yet.
// ---------------------------------------------------------------------------
export type Product = ProductDto;
export type Order = OrderResponseDto;
export type OrderLineItem = OrderResponseDto["lineItems"][number];
export type OrderStatus = OrderResponseDto["status"];
export type OrderTransitionAction = TransitionOrderDto["action"];
export type AuditLogEntry = AuditLogResponseDto["logs"][number];
export type AuditLogResponse = AuditLogResponseDto;
export type AdminDashboard = AdminDashboardDto;
export type AdminOrder = AdminOrderListDto["orders"][number];
export type AdminOrderList = AdminOrderListDto;
export type AdminOrderFilter = { status?: string; vendorId?: string; type?: 'stuck' | 'all'; limit?: number; offset?: number };
export type AdminAuditLog = AdminAuditLogResponseDto["logs"][number];
export type AdminAuditLogResponse = AdminAuditLogResponseDto;
export type AdminAuditLogFilter = { correlationId?: string; entityType?: string; entityId?: string; action?: string; limit?: number; offset?: number };
export type AdminResolvePayload = AdminResolveLineItemDto;
export type DeadLetterJob = DeadLetterJobDto;
export type HealthStatus = HealthStatusDto;

// ---------------------------------------------------------------------------
// Aliases
// ---------------------------------------------------------------------------

export const getCatalog = getProducts;
