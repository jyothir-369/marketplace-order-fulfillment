# Marketplace UI Design Context
## Complete reference for designing UI with ChatGPT / visual tooling

---

## 1. What This Project Is

A **multi-vendor marketplace** where buyers browse products, check out atomically across multiple vendors, and track order fulfillment in real time. Vendors see their own inventory and fulfillment queues. Admins monitor and resolve stuck/ambiguous jobs.

Three distinct user experiences must coexist cleanly — never bleed into each other:
- **Buyer Storefront** — browse, cart, checkout, order history
- **Vendor Portal** — inventory management, orders, dead-letter queue
- **Admin Console** — all orders, audit logs, category/vendor management, dead-letter resolution

---

## 2. Brand Identity

- **Name:** Marketplace
- **Domain:** Multi-vendor B2C catalog + order fulfillment
- **Feel:** Professional, trustworthy, fast. Not flashy. Not enterprise-ugly.
- **Tone:** Confident. Correctness-first. The whole value proposition is that the system handles edge cases gracefully — the UI should communicate that confidence.

---

## 3. Color System (design tokens)

All colors are defined as **HSL CSS variables** in `frontend/app/globals.css`. Use these tokens in every design decision. Never hardcode hex or Tailwind palette colors.

### Light Mode (default) — written as `hsl(var(--color-*))`

| Token | HSL | Use |
|---|---|---|
| --color-background | 0 0% 100% | Page background |
| --color-foreground | 240 10% 3.9% | Primary text |
| --color-card | 0 0% 100% | Card surfaces |
| --color-primary | 240 5.9% 10% | Buttons, key actions |
| --color-primary-foreground | 0 0% 98% | Text on primary |
| --color-secondary | 240 4.8% 95.9% | Subtle backgrounds |
| --color-muted | 240 4.8% 95.9% | Disabled / placeholder |
| --color-muted-foreground | 240 3.8% 46.1% | Secondary text |
| --color-accent | 240 4.8% 95.9% | Hover states |
| --color-accent-foreground | 240 5.9% 10% | Text on accent |
| --color-destructive | 0 84.2% 60.2% | Errors, danger actions |
| --color-destructive-foreground | 0 0% 98% | Text on destructive |
| --color-success | 142 71% 45% | Success states |
| --color-success-foreground | 0 0% 98% | Text on success |
| --color-warning | 38 92% 50% | Warning states |
| --color-warning-foreground | 240 10% 3.9% | Text on warning |
| --color-info | 199 89% 48% | Informational / cart badge |
| --color-info-foreground | 0 0% 98% | Text on info |
| --color-border | 240 5.9% 90% | Borders, dividers |
| --color-input | 240 5.9% 90% | Input borders |
| --color-ring | 240 5.9% 10% | Focus rings |

### Status Colors (applies to both light/dark)
--color-status-placed, --color-status-confirmed, --color-status-fulfilling, --color-status-fulfilled, --color-status-cancelled, --color-status-failed, --color-status-dead-letter, --color-status-ambiguous, --color-status-pending, --color-status-in-progress, --color-status-shipped, --color-status-manual-intervention, --color-status-retry.

### Dark Mode
Toggle by adding `data-theme="dark"` to `<html>`. All --color-* tokens are overridden in `:root[data-theme="dark"]` with darker HSL values.

### Sidebar Tokens (operational surfaces)
--color-sidebar-bg, --color-sidebar-border, --color-sidebar-text, --color-sidebar-text-muted, --color-sidebar-active-bg, --color-sidebar-badge, --color-sidebar-tag-vendor-bg, --color-sidebar-tag-admin-bg.

---

## 4. Typography

- **Font stack:** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`
- **Storefront density:** `comfortable` — 15px base, 3rem row heights
- **Operational density:** `compact` — 13px base, 2.25rem row heights
- Apply via `data-density="comfortable"` or `data-density="compact"` on `<html>` or any container

---

## 5. Design Effects

### Glassmorphism (storefront)
- `.glass-panel` — backdrop-filter blur + 60% opacity card + subtle border
- `.glass-panel-strong` — stronger blur + 85% opacity + deeper shadow

### Animations
- `.animate-pulse` — 2s ease-in-out opacity pulse (dots, live indicators)
- `.animate-pulse-strong` — scale + opacity pulse for emphasis

### Radius
- `--radius: 0.5rem` (all corners)

---

## 6. Status Vocabulary (canonical)

All status indicators must use `StatusBadge` or `getStatusToken()` from `lib/status-tokens.ts`. Never hardcode status colors.

### Order Lifecycle
`PLACED` → `CONFIRMED` → `FULFILLING` → `FULFILLED` | `CANCELLED` | `FAILED`

### Line Item Fulfillment
`PENDING` → `IN_PROGRESS` → `SHIPPED` | `AMBIGUOUS` | `MANUAL_INTERVENTION_REQUIRED`

### Sync Job (BullMQ)
`pending` → `in_progress` → `completed` | `failed` | `dead_letter` | `ambiguous` | `retry`

---

## 7. UI Component Library

All reusable components live in `frontend/components/ui/`.

| Component | Purpose |
|---|---|
| StatusBadge | Renders status with icon, dot, label, color from getStatusToken() |
| Skeleton | Generic pulsing placeholder (accepts width, height) |
| CatalogGridSkeleton | 1→2→3→4 col grid of pulsing card placeholders |
| OrderDetailSkeleton | Order detail page skeleton |
| EmptyState | Icon + title + description + optional action; for 0-results |
| Toast / ToastProvider | Success/error/info/warning notifications |
| Button | Standard button wrapper |
| RouteErrorFallback | Full-card error fallback for route segments |
| ErrorBoundary | Client-side React ErrorBoundary wrapper |

---

## 8. Storefront Components

`frontend/components/storefront/`

| Component | Purpose |
|---|---|
| StorefrontHeader | Sticky top bar: logo, nav links (Catalog/Vendors/Orders), global search form, cart trigger |
| CartDrawer | Radix Dialog slide-over; groups items by vendor, shows subtotals, links to checkout |
| CatalogGrid | Responsive 1→2→3→4 col grid; delegates to ProductCard or CatalogGridSkeleton or EmptyState |
| ProductCard | Glassmorphic card: image placeholder, name, vendor, price, stock badge, quantity stepper, Add-to-cart |
| VendorCard | Glassmorphic card: vendor avatar, name, active product count |
| CheckoutForm | Zod-validated form: shipping address, cart summary, submit |

---

## 9. Operational Components

`frontend/components/operational/`

| Component | Purpose |
|---|---|
| OperationalSidebar | Fixed dark sidebar with role badge (Vendor/Admin), nav links, optional footer |
| TelemetryCard | Compact metric tile: label, tabular value, optional trend, icon, tone ring (default/warning/danger/success) |
| AuditLogTimeline | Chronological event list with correlation ID tracing |
| DeadLetterInspector | Dead-letter job detail with retry action |
| FulfillmentDataTable | TanStack Table wrapper with sortable columns, pagination, row expansion |
| FulfillmentMetricsChart | Simple metrics visualization |
| VendorQueueLatencyChart | Queue latency chart |
| ErrorBoundary | Operational-specific error boundary |

---

## 10. Admin Components

`frontend/components/admin/`

| Component | Purpose |
|---|---|
| ResolveLineItemDialog | Modal for admin to manually resolve a stuck line item |
| AuditTimeline | Admin audit log timeline |

---

## 11. Route Map

FRONTEND: `http://localhost:3000`

`(storefront)` — Buyer experience
- `/products` — Catalog grid + category tabs + search
- `/products/[id]` — Product detail
- `/vendors` — Vendor directory
- `/vendors/[vendorId]` — Vendor storefront (their products)
- `/checkout` — Checkout form
- `/orders` — Buyer order history
- `/orders/[id]` — Order detail + live fulfillment status

`(operational)` — Dark sidebar, compact density
- `/admin` — Admin dashboard
  - `/admin/orders` — All orders with filters
  - `/admin/orders/[id]` — Admin order detail
  - `/admin/categories` — Category CRUD
  - `/admin/vendors` — Vendor onboarding
  - `/admin/dead-letter` — Admin DLQ viewer
  - `/admin/audit-logs` — Full audit log with trace mode
- `/vendor` — Vendor portal
  - `/vendor/dashboard` — KPI cards, stock health, sync health
  - `/vendor/inventory` — Product list with inline stock editing
  - `/vendor/orders` — Vendor orders with status transitions
  - `/vendor/dead-letter` — Vendor DLQ viewer

BACKEND: `http://localhost:3001`
- `/api/health`
- `/api/catalog` — GET (with ?category= filter), POST seed
- `/api/orders` — Checkout, list, get, transition, cancel
- `/api/fulfillment` — Sync, reconcile, dead-letter, stats
- `/api/admin` — Dashboard, orders, dead-letter, audit-logs
- `/api/inventory` — Per-product GET

---

## 12. Data Model (core types)

All types live in `frontend/lib/types.ts`. Import from there — never duplicate.

`Product` { id, vendorId, vendorName, name, price, stockCount, category, isActive, createdAt, updatedAt }
`VendorResponseDto` { id, name, productCount, activeProductCount, createdAt }
`VendorDetailDto` { id, name, productCount, activeProductCount, totalStock, lowStockCount, outOfStockCount, createdAt }
`VendorDashboardDto` { vendorId, vendorName, productCount, activeProductCount, totalStock, lowStockCount, outOfStockCount, pendingSyncJobs, deadLetterJobs, ambiguousJobs, openOrders }
`OrderResponseDto` { id, orderNumber, status, lineItems[], totalAmount, buyerId, createdAt, updatedAt }
`CheckoutDto` { shippingAddress, buyerId, items[] }
`CategorySummaryDto` { name, productCount, activeProductCount, totalStock }
`AuditLogEntryDto` { id, correlationId, action, entityType, entityId, message, userId, metadata, createdAt }
`DeadLetterJobDto` { id, orderLineItemId, status, attempts, lastAttemptedAt, error, correlationId }

---

## 13. API Functions

All API functions live in `frontend/lib/api.ts` and call `http://localhost:3001/api`.

| Function | Method | Endpoint |
|---|---|---|
| getCatalog(params?) | GET | /catalog?category=&q=&vendor=&maxPrice= |
| seedCatalog() | POST | /catalog/seed → 201 |
| getProductById(id) | GET | /catalog/:id |
| getVendors() | GET | /catalog/vendors |
| getVendorProducts(vendorId) | GET | /catalog/vendor/:id |
| updateStock(productId, body) | PATCH | /catalog/:productId |
| createProduct(body) | POST | /catalog |
| checkoutOrder(body) | POST | /orders/checkout → CheckoutResponseDto |
| getOrdersForBuyer(buyerId) | GET | /orders/buyer/:buyerId |
| getOrderById(orderId) | GET | /orders/:id |
| transitionOrder(orderId, action) | POST | /orders/:id/transition |
| cancelOrder(orderId, body) | POST | /orders/:id/cancel |
| getVendorOrders(vendorId) | GET | /orders/vendor/:vendorId |
| getVendorDeadLetterJobs(vendorId) | GET | /fulfillment/dead-letter?vendorId= |
| getVendorDashboard(vendorId) | GET | /catalog/vendor/:id/dashboard |
| getAdminCategories() | GET | /catalog/categories |
| createCategory(body) | POST | /catalog/categories |
| getAdminVendors() | GET | /catalog/vendors/admin |
| createVendor(body) | POST | /catalog/vendors |
| getAdminDashboard() | GET | /admin/dashboard |
| getAdminOrders(filter) | GET | /admin/orders?status=&type= |
| resolveLineItem(lineItemId, body) | POST | /admin/line-items/:id/resolve |
| cancelAdminOrder(orderId, body) | POST | /admin/orders/:id/cancel |
| getDeadLetterJobs() | GET | /admin/dead-letter |
| retryDeadLetterJob(jobId) | POST | /admin/dead-letter/:id/retry |
| getAuditLogs(filter) | GET | /admin/audit-logs |
| getCorrelationTrace(correlationId) | GET | /admin/trace/:correlationId |
| getHealth() | GET | /health |

---

## 14. Cart Architecture

State managed by Zustand with `persist` middleware. Lives in `frontend/context/CartStore.ts`.

- **Buyer ID constant:** `00000000-0000-0000-0000-000000000001`
- **SSR safety:** Gate cart-dependent UI on `hydrated === true`
- Cart items group by vendor at checkout (subtotals shown in CartDrawer)
- 409 Conflict on `updateStock` → refetch inventory to resolve race

---

## 15. Density Modes

**Storefront (`data-density="comfortable"`)** — generous whitespace, 15px base font, 3rem rows. Large click targets, spacious cards.

**Operational (`data-density="compact"`)** — tight spacing, 13px base font, 2rem rows. Dense scannable tables, minimal decoration.

Apply via `data-density="compact"` on the `<html>` tag or any layout wrapper.

---

## 16. Error Handling Architecture

- Route segment errors → `error.tsx` at each route level (Next.js App Router convention)
- Client render errors → `ErrorBoundary` component wrapping layout subtrees
- API errors → `try/catch` in each `useEffect`/`async` handler; shown as Toast or inline alert
- "Failed to fetch" → explicit error banner in products page, never conflated with empty state
- "0 products found" → only shown after `hasLoaded === true` with a confirmed empty API response

---

## 17. Key Design Rules

1. **Never use hardcoded hex colors.** Always use `hsl(var(--color-*))`.
2. **Never use Tailwind palette colors directly** (e.g. `bg-zinc-900`, `text-red-500`). Use design tokens.
3. **Storefront = glass + whitespace. Operational = dark + dense.**
4. **StatusBadge for ALL status display.** Never manually style a status label.
5. **Cart-dependent rendering must check `hydrated`.** Avoid hydration mismatch.
6. **URL drives all filter state.** Category tabs and search write to `?category=` and `?q=` params.
7. **Empty state ≠ error state.** These must be visually distinct.
8. **Next.js Route Groups:** `(storefront)` and `(operational)` have separate layouts.

---

## 18. How to Use This Document for ChatGPT

When prompting ChatGPT to design UI, include this document and reference:
- The **exact token names** (e.g. `hsl(var(--color-primary))`) instead of describing colors
- The **component names** (e.g. `StatusBadge`, `TelemetryCard`, `EmptyState`) as building blocks
- The **route paths** for context
- The **density mode** (`comfortable` vs `compact`) for spacing guidance
- The **visual language**: glassmorphism for storefront, dark-sidebar compact for operational

**Example prompt:**
> "Design a vendor performance summary card for /vendor/dashboard using the TelemetryCard component. Use the `success` tone when outOfStockCount is 0. The data comes from VendorDashboardDto. Use `data-density='compact'` and the dark sidebar. Reference the color tokens in the design context."
