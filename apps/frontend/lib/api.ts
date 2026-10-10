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
  CatalogQuery,
  CatalogListResponse,
  ReviewListResponse,
  CreateReviewDto,
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

/** Server-side paginated catalog query (Phase 2). GET /api/catalog with query params. */
export async function getCatalogPage(query: CatalogQuery = {}): Promise<CatalogListResponse> {
  return apiFetch<CatalogListResponse>("/catalog", {
    params: {
      q: query.q,
      category: query.category,
      vendor: query.vendor,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
      includeInactive: query.includeInactive ? "true" : undefined,
    },
  });
}

/**
 * Legacy helper — returns an unpaged array of products.
 * Calls the paged endpoint with pageSize 1000 and unwraps `.items`
 * so existing callers (deals page, vendor detail page) keep working.
 */
export async function getProducts(filter: { category?: string } = {}): Promise<ProductDto[]> {
  const pageSize = 100;

  const firstPage = await getCatalogPage({
    category: filter.category,
    page: 1,
    pageSize,
  });

  const products: ProductDto[] = [...firstPage.items];

  // Fetch remaining pages using the backend's maximum allowed page size.
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const result = await getCatalogPage({
      category: filter.category,
      page,
      pageSize,
    });
    products.push(...result.items);
  }

  return products;
}

export const getCatalog = getProducts;

/** Soft-delete a product (vendor/admin). DELETE /api/catalog/:id */
export async function deleteProduct(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/catalog/${id}`, { method: "DELETE" });
}

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
  if (includeInactive) {
    return apiFetch<ProductDto[]>(`/catalog/vendor/${vendorId}/manage`);
  }

  // Public storefront requests always return active products.
  return apiFetch<ProductDto[]>(`/catalog/vendor/${vendorId}`);
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

/** PATCH /api/catalog/:id — update product (name, category, price, stock, active). Uses bearer auth, returns ProductDto. */
export async function updateProduct(
  id: string,
  payload: Partial<{ name: string; category: string; price: number; stockCount: number; isActive: boolean }>
): Promise<ProductDto> {
  return apiFetch<ProductDto>(`/catalog/${id}`, {
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

/** GET /api/catalog/reviews/product/:productId */
export async function getReviews(productId: string): Promise<ReviewListResponse> {
  return apiFetch<ReviewListResponse>(`/catalog/reviews/product/${productId}`);
}

/** POST /api/catalog/reviews */
export async function createReview(payload: CreateReviewDto): Promise<{ message: string; reviewId: string }> {
  return apiFetch<{ message: string; reviewId: string }>("/catalog/reviews", {
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

/**
 * GET /api/orders/me — the currently authenticated buyer's own order history.
 *
 * Phase 3.2: `/orders/buyer/:buyerId` was public (anyone could enumerate any
 * buyer's orders) and is now ADMIN/OPERATIONS support-only. The buyer-facing
 * route resolves the identity from the bearer token instead of a client-
 * supplied id.
 */
export async function getOrdersForBuyer(): Promise<OrderResponseDto[]> {
  return apiFetch<OrderResponseDto[]>(`/orders/me`).then((orders) =>
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

export async function getAmbiguousJobs(): Promise<DeadLetterJobDto[]> {
  return apiFetch<DeadLetterJobDto[]>("/fulfillment/ambiguous");
}

export async function runReconciliation(payload?: { olderThanMinutes?: number }): Promise<{ processed: number; resolved: number; stillAmbiguous: number; errors: string[] }> {
  return apiFetch<{ processed: number; resolved: number; stillAmbiguous: number; errors: string[] }>("/fulfillment/reconcile", {
    method: "POST",
    body: JSON.stringify(payload ?? { olderThanMinutes: 10 }),
  });
}

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
// Categories (public storefront + admin)
// ---------------------------------------------------------------------------

/** GET /api/catalog/categories — live category counts for storefront tabs. */
export async function getCategories(): Promise<CategorySummaryDto[]> {
  return apiFetch<CategorySummaryDto[]>("/catalog/categories");
}

// ---------------------------------------------------------------------------
// Admin: categories
// ---------------------------------------------------------------------------

/** GET /api/catalog/categories (admin alias — same endpoint) */
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

/** Phase 4 — Autocomplete endpoint for SearchBar typeahead. */
export async function getAutocomplete(q?: string): Promise<{ products: string[]; vendors: string[]; categories: string[] }> {
  return apiFetch<{ products: string[]; vendors: string[]; categories: string[] }>("/catalog/autocomplete", {
    params: { q: q || undefined },
  });
}

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

/** POST /api/orders/checkout (idempotency + price conflict 409 handling — Phase 7) */
export async function checkoutWithIdempotency(payload: CheckoutDto & { idempotencyKey?: string }): Promise<CheckoutResponseDto> {
  return apiFetch<CheckoutResponseDto>("/orders/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((res) => {
    if (res.order) res.order = parseOrder(res.order);
    return res;
  });
}

/** Phase 7 — coupon validation stub */
export async function validateCoupon(code: string, orderTotal?: number): Promise<{ valid: boolean; discount?: number; message?: string }> {
  return apiFetch<{ valid: boolean; discount?: number; message?: string }>("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, orderTotal }),
  }).catch(() => ({ valid: false, message: "Invalid coupon" }));
}

/** GET /api/auth/me — current authenticated user (requires a valid access token). */
export async function getMe(): Promise<UserDto> {
  return apiFetch<UserDto>("/auth/me");
}
export interface RazorpayInitiationRequest {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: string;
}

export interface RazorpayInitiationResponse {
  success: true;
  orderId: string;
  orderNumber: string | null;
  providerOrderId: string;
  publicKeyId: string;
  amountPaise: number;
  currency: string;
}

export interface RazorpayVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerificationResponse {
  verified: boolean;
  alreadyProcessed: boolean;
  orderId: string;
  paymentId: string;
}

export async function initiateRazorpayOrder(
  payload: RazorpayInitiationRequest,
): Promise<RazorpayInitiationResponse> {
  return apiFetch<RazorpayInitiationResponse>("/payments/razorpay/initiate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyRazorpayPayment(
  payload: RazorpayVerificationRequest,
): Promise<RazorpayVerificationResponse> {
  return apiFetch<RazorpayVerificationResponse>("/payments/razorpay/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
