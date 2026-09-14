/**
 * lib/api.ts — typed fetch client
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
  VendorDashboardDto,
  CategorySummaryDto,
  VendorDetailDto,
  VendorResponseDto,
  AuthTokensDto,
  UserDto,
  RegisterDto,
  LoginDto,
} from "@/lib/types";
import { getAccessToken } from "@/lib/auth-token";

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

  // Attach the bearer token when present (Phase 1 auth). SSR-safe: reads are
  // no-ops without `window`, and authenticated calls only run in the browser.
  const accessToken = getAccessToken();
  const authHeaders: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...authHeaders, ...fetchInit?.headers },
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
// Type guard — defensive parse of order responses
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
export async function getProducts(filter: { category?: string } = {}): Promise<ProductDto[]> {
  return apiFetch<ProductDto[]>("/catalog", {
    params: { category: filter.category },
  });
}

export const getCatalog = getProducts;

/** GET /api/catalog/:id */
export async function getProductById(id: string): Promise<ProductDto> {
  return apiFetch<ProductDto>(`/catalog/${id}`);
}

// ---------------------------------------------------------------------------
// Vendor directory
// ---------------------------------------------------------------------------

/** GET /api/catalog/vendors */
export async function getVendors(): Promise<VendorResponseDto[]> {
  return apiFetch<VendorResponseDto[]>("/catalog/vendors");
}

/** GET /api/catalog/vendor/:vendorId */
export async function getVendorProducts(
  vendorId: string = VENDOR_ID,
  includeInactive = false
): Promise<ProductDto[]> {
  return apiFetch<ProductDto[]>(`/catalog/vendor/${vendorId}`, {
    params: { includeInactive: includeInactive ? "true" : "false" },
  });
}

export const getVendorCatalog = getVendorProducts;

// ---------------------------------------------------------------------------
// Inventory / vendor product management
// ---------------------------------------------------------------------------

/** PATCH /api/catalog/:id */
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
export async function createProduct(payload: CreateProductDto): Promise<ProductDto> {
  return apiFetch<ProductDto>("/catalog", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Order audit logs
// ---------------------------------------------------------------------------

/** GET /api/orders/:orderId/audit */
export async function getOrderAuditLogs(orderId: string): Promise<AuditLogResponseDto> {
  return apiFetch<AuditLogResponseDto>(`/orders/${orderId}/audit`);
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/** POST /api/orders/checkout */
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
): Promise<OrderResponseDto> {
  return apiFetch<OrderResponseDto>(`/orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(parseOrder);
}

/** GET /api/orders/buyer/:buyerId */
export async function getOrdersForBuyer(
  buyerId: string = "00000000-0000-0000-0000-000000000001"
): Promise<OrderResponseDto[]> {
  return apiFetch<OrderResponseDto[]>(`/orders/buyer/${buyerId}`).then((orders) =>
    orders.map(parseOrder)
  );
}

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
// Vendor dashboard (Phase 3)
// ---------------------------------------------------------------------------

/** GET /api/catalog/vendor/:vendorId/dashboard */
export async function getVendorDashboard(
  vendorId: string = VENDOR_ID
): Promise<VendorDashboardDto> {
  return apiFetch<VendorDashboardDto>(`/catalog/vendor/${vendorId}/dashboard`);
}

// ---------------------------------------------------------------------------
// Admin: categories
// ---------------------------------------------------------------------------

/** GET /api/catalog/categories */
export async function getAdminCategories(): Promise<CategorySummaryDto[]> {
  return apiFetch<CategorySummaryDto[]>("/catalog/categories");
}

/** POST /api/catalog/categories */
export async function createCategory(payload: { name: string }): Promise<CategorySummaryDto> {
  return apiFetch<CategorySummaryDto>("/catalog/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Admin: vendors
// ---------------------------------------------------------------------------

/** GET /api/catalog/vendors/admin */
export async function getAdminVendors(): Promise<VendorDetailDto[]> {
  return apiFetch<VendorDetailDto[]>("/catalog/vendors/admin");
}

/** POST /api/catalog/vendors */
export async function createVendor(payload: { name: string }): Promise<VendorDetailDto> {
  return apiFetch<VendorDetailDto>("/catalog/vendors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/catalog/vendor/:vendorId/detail */
export async function getVendorDetail(vendorId: string): Promise<VendorDetailDto> {
  return apiFetch<VendorDetailDto>(`/catalog/vendor/${vendorId}/detail`);
}// ---------------------------------------------------------------------------
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
export async function cancelAdminOrder(orderId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

/** GET /api/admin/dead-letter */
export async function getDeadLetterJobs(): Promise<DeadLetterJobDto[]> {
  return apiFetch<DeadLetterJobDto[]>("/admin/dead-letter");
}

/** POST /api/admin/dead-letter/:jobId/retry */
export async function retryDeadLetterJob(jobId: string): Promise<{ message: string }> {
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
  return apiFetch<AdminAuditLogResponseDto>(`/admin/trace/${correlationId}`);
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

/** GET /api/health */
export async function getHealth(): Promise<HealthStatusDto> {
  return apiFetch<HealthStatusDto>("/health");
}

// ---------------------------------------------------------------------------
// Re-exports (backwards compat)
// ---------------------------------------------------------------------------
export type {
  OrderResponseDto as Order,
  VendorResponseDto,
};
export type Product = ProductDto;
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
// Auth (Phase 1)
// ---------------------------------------------------------------------------

/** POST /api/auth/register — always provisions a BUYER role account. */
export async function registerAccount(payload: RegisterDto): Promise<UserDto> {
  return apiFetch<UserDto>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export const register = registerAccount;

/** POST /api/auth/login — returns access + refresh tokens. */
export async function loginAccount(payload: LoginDto): Promise<AuthTokensDto> {
  return apiFetch<AuthTokensDto>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export const login = loginAccount;

/** POST /api/auth/refresh — rotates the refresh token, returns a fresh pair. */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokensDto> {
  return apiFetch<AuthTokensDto>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

/** POST /api/auth/logout — revokes the presented refresh token. */
export async function logoutAccount(refreshToken: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export const logout = logoutAccount;

/** GET /api/auth/me — current authenticated user (requires a valid access token). */
export async function getMe(): Promise<UserDto> {
  return apiFetch<UserDto>("/auth/me");
}
