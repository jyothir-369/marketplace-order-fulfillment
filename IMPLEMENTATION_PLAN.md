# Marketplace Order & Fulfillment — Master Implementation Blueprint

---

## 1. Executive Summary

The product today is a **functional but narrow marketplace shell** with a genuinely strong backend core. The backend already proves the hard engineering: atomic multi-vendor checkout with pessimistic row locking, concurrency-safe inventory decrement, BullMQ vendor-sync workers with per-vendor queues, bounded retries, dead-letter handling, a 5-minute reconciliation job, correlation-ID audit logging, and an expand-and-contract migration (shipping address + order number). The frontend has a polished **V2 Premium** design system (ink-navy/ivory/brass, Playfair + Inter, editorial storefront, dark compact operational portals) and a working browse → cart → checkout → order-tracking loop.

But the product is **not yet a marketplace**. Critical gaps, in order of severity:

1. **The frontend and backend are out of sync.** `apps/frontend/lib/api.ts` targets ~10 endpoints that do not exist on the backend (`/catalog/vendors`, `/catalog/categories`, `/catalog/vendors/admin`, `/catalog/vendor/:id/dashboard`, `/catalog/vendor/:id/detail`, `PATCH /catalog/:id`, `POST /catalog/seed`, `/orders/:id/transition`, `/orders/:id/cancel`, `/orders/vendor/:vendorId`). Many admin/vendor dashboard pages render against these missing endpoints and will error at runtime.
2. **There is no `category` column on `Product`** — yet the storefront's entire filtering model, `ProductDto.category`, and the "Categories" ribbon all depend on it. Every seeded product has `category = null`; the category tabs return zero results unless you also migrate + seed.
3. **There is no authentication or authorization.** No login, no users, no roles. The app hard-codes `BUYER_ID = …0001` and `VENDOR_ID = …1111`. `useRoleGuard` reads a `window.__SESSION__` global that nothing ever sets. The `DashboardController` reads `req.user` from a JWT that never exists.
4. **The deployed frontend calls `http://localhost:3001/api`.** `NEXT_PUBLIC_API_BASE_URL` is only set in `apps/frontend/.env.local` (a UTF-16-encoded local file pointing at localhost). Nothing configures the production API URL on Vercel at build time. This is the known production bug the brief references.
5. **Whole marketplace surface areas are absent** — real categories, home page, product detail richness (reviews, gallery, related), wishlist page, account, checkout depth (addresses/shipping/payment/coupon), buyer/vendor/admin analytics, notifications, promotions/deals entities, reviews, search.

This plan is organized into **15 implementation phases** (P0 foundation → P1 core commerce → P2 operational depth → P3 polish/reliability), each with concrete files, API/database changes, and acceptance criteria, plus a dependency graph, priority matrix, and file-level implementation map. The plan deliberately **preserves every existing correctness guarantee** — transactions, row locks, retry/DLQ, reconciliation, audit logging — and never trades them away for UI convenience.

**Recommended top-line priority:** (1) fix the production API URL + real auth, (2) add the `category` field + category API, (3) build the missing backend endpoints the current UI already requires, (4) then expand into new commerce surface area phase by phase.

---

## 2. Current Architecture Audit

| Area | State | Detail |
|---|---|---|
| Repo | npm workspaces monorepo | `apps/frontend`, `apps/backend`; root `package.json` scripts drive turbo (`dev`, `build`, `lint`, `typecheck`, `seed`, `migration:*`). `packageManager: npm@10.9.0`, Node ≥ 20. |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (CSS-first `@theme`), Zustand, TanStack Query, react-hook-form + zod, Radix Dialog, TanStack Table, Recharts, lucide-react | Route groups separate buyer (`(storefront)`) and operational (`(operational)`) experiences at the layout level. |
| Backend | NestJS 10, TypeORM, PostgreSQL, Redis + BullMQ, @nestjs/schedule | Global prefix `/api`; global `ValidationPipe` (whitelist + transform); CORS effectively permissive. |
| Database | Supabase Postgres (root `.env` `DATABASE_URL`); `synchronize: true` in non-production; 3 expand/contract migrations present (shipping_address, backfill, order_number) | Migration runner exists but the runner's migration list doesn't include `order_number`. DB schema is derived from entities (synchronize), so schema drift risk is real. |
| Auth | **None** | No `AuthModule`, no JWT/passport, no guards. Roles are assumed placeholders. |
| State | Cart + Wishlist are **local-only** (Zustand `persist`) | No server cart. Cleared on another device. No price/stock revalidation against backend until checkout. |
| Data fetching | Per-component `useState`+`useEffect` with direct `lib/api.ts` calls; TanStack Query only for order polling | No shared query client cache for catalog; refetch on nav happens via remount. |
| Background jobs | BullMQ: central `vendor-sync` queue + per-vendor dynamic queues (`vendor-sync-{vendorId}`, concurrency 3) + isolated processor | 5 attempts exponential backoff 1s; removeOnComplete 100 / removeOnFail 1000; reconciliation cron every 5 min; vendor-mock simulates success/failure/timeout/duplicate. |
| Observability | Correlation-ID audit logs across checkout → inventory → sync; `store.js` err-patched; health/live/ready endpoints; admin trace API | Dashboard overview controller/service is a **stub** returning zeros. |
| CI/CD | GitHub Actions (`ci-cd.yml`): lint+typecheck, backend build, frontend build, Docker build/push (backend), Railway deploy, Vercel deploy | CI has **no test job**. Frontend `.env.local` overrides API URL with localhost. |
| Testing | Backend: jest unit specs (admin, fulfillment, orders lifecycle, inventory, dashboard helpers) + `test/concurrency.spec.ts` + `test/e2e/order-lifecycle.e2e-spec.ts`. **Frontend: no tests at all.** No Playwright. | |
| Docs | `MARKETPLACE_UI_CONTEXT.md`, `prd.md`, `DESIGN_ARCHITECTURE.md`, `frontend-architecture-spec.md`, `marketplace-design-brief-for-agent.md`, `DEPLOYMENT.md`, `docs/PHASE7_MIGRATION.md`, `docs/V2_PREMIUM_THEME_PHASES.md` | The V2 Premium design direction (ink-navy/brass/ivory, Playfair serif) is already implemented in the storefront. |

### Where the existing architecture is strong (do not disturb)

- **Checkout transaction** (`orders/orders.service.ts`): sorted product IDs → `SELECT … FOR UPDATE` pessimistic locks → stock check per line → decrement + order + line-item creation + audit inside one transaction. Exactly the concurrency guarantee the PRD demands.
- **Inventory service**: separate `decrementStock`/`restoreStock` with row locks + audit, returning typed stock-operation results — safe building block for reserve/cancel flows.
- **Fulfillment**: per-vendor queue isolation (slow vendor can't starve others), retry/backoff, DLQ state, ambiguous-state reconciliation instead of assuming timeout = failure. This matches the ops dashboard 1:1 already.
- **Audit**: `correlationId` plumbed through checkout → inventory → sync; `AuditModule` + admin trace endpoint.
- **Design system**: token-driven Tailwind v4, status vocabulary in `lib/status-tokens.ts`, consistent loading/empty/error patterns, `ErrorBoundary`, route-level `error.tsx`.

### Where the architecture is missing / should change

- No authN/authZ layer at all (blocker for every user-specific feature).
- No `User`, `Category`, `Address`, `Review`, `Notification`, `Promotion`, `Coupon`, `RecentlyViewed` entities; no server-side Wishlist/Cart.
- Catalog API is `findAll` only — no filtering/sorting/pagination/aggregation in SQL.
- `DashboardModule` is a stub.
- Frontend fetches full catalog into the browser and filters client-side (fine for 25 products, fatal at scale).
- `NEXT_PUBLIC_API_BASE_URL` not wired for production builds.
- TypeORM `synchronize:true` in dev plus stale migration registry = schema drift risk; catalog needs a real migrations discipline once entities expand.

---

## 3. Current UI Audit

| Screen | Route | What exists | Missing |
|---|---|---|---|
| Home | `/` | Empty — `redirect("/products")` | Real homepage (hero, categories, deals, bestsellers, vendors, trust, footer) |
| Catalog | `/products` | Editorial navy hero, metrics ribbon, hardcoded category pills, vendor select, max-price input, sort select (4 opts), client-side filter+sort, 3-col grid with `ProductCard`, seed button | Server-side filtering/sorting, pagination, stock/rating/discount filters, skeletons per filter, URL-encoded search term sync, category counts |
| Product detail | `/products/[id]` | PhotoBlock gallery, purchase panel (price, stock indicator, qty, Add/Buy Now), ships-from callout | Image gallery w/ thumbs, reviews, specs, vendor card, related/recommended, FBT, recently-viewed, breadcrumbs, wishlist on PDP |
| Vendors | `/vendors` | Hero, 4 trust stats, client-filter pills (hardcoded category→name substring heuristics), `VendorCard` grid | Real vendor categories via API, rating/policy/shipping data, pagination |
| Vendors detail | `/vendors/[vendorId]` | Editorial hero + "Our Story" (template copy) + 4 stat tiles + provenance tags + catalog grid | Rich vendor profile (policies, returns, shipping), review ratings driven by data, contact |
| Cart | CartDrawer (all pages) | Slide-over, vendor grouping model in store, qty stepper, subtotal, checkout CTA | Save-for-later, price/stock change warnings, per-vendor shipping, discount/tax lines, remove-all |
| Checkout | `/checkout` | One-page: order summary table + single shipping-address textarea + RHF/Zod validation; posts `CheckoutDto`; clears cart; success screen with redirect | Address book, shipping method, tax, coupon, review step, idempotency key e2e, 409 conflict resolution UI, payment abstraction |
| Orders | `/orders` | Table: order#, status badge, items, total, placed, View link | Filter/tab by status, pagination, reorder, cancel in-UI (backend cancel exists), empty actions |
| Order detail | `/orders/[id]` | Polling (3s→15s backoff, stops at terminal), status, line items, correlation tracing, `InventoryLockIndicator` | Timeline, per-line-item fulfillment drill-down (it has data for this), shipment tracking, invoice, vendor contact, support |
| Deals | `/deals` | "Deals Room" hero + **derived** deal feed = lowest-priced third of catalog | Real promotions; discount %, expiry, urgency, coupon codes |
| Wishlist | — (no page) | Heart on cards + Zustand `localStorage` store; `storefront-nav.ts` lists `/wishlist` → **404** | `/wishlist` page, move-to-cart, price-drop/stock signals, share, clear-all |
| Account | `Account` header link → `/orders` | None | Real `/account`: profile, orders, wishlist, addresses, notifications, security, preferences |
| Buyer dashboard | `/dashboard` | Stub to `/api/dashboard/overview` (backend stub) | Everything (spending, order stats, recent activity) |
| Vendor portal | `(operational)/vendor/*` | Sidebar, dashboard KPI tiles, inventory page, orders, DLQ | Product CRUD (create/edit exists in api.ts but no backend), analytics, promotions, settings |
| Admin console | `(operational)/admin/*` | Dashboard KPIs + charts (mock data), orders table w/ expand+resolve, categories page, vendors page, DLQ, audit logs + trace | Real chart data endpoints, products table, customers, inventory, reconciliation ops surface, system health, settings, guard gating |
| Support | `/help`, `/about` (footer links) | **404** | Help center, about |

**Design system state:** Strong. Theme tokens in `globals.css` (`@theme`), TS token catalog in `lib/theme.ts`, status vocabulary in `lib/status-tokens.ts`, shared UI primitives in `components/ui/` (`Button`, `EmptyState`, `Skeleton`, `Toast`, `StatusBadge`, `PhotoBlock`, `RouteErrorFallback`). The visual language is **already V2 Premium** on the storefront; the operational side is dark+compact. The plan should *extend* this system, not rebuild it.

---

## 4. Current Navigation Audit

- **Storefront header** (`StorefrontHeader.tsx`): wordmark → `/products`; desktop links Shop / Vendors / Orders; center global search (pushes `?q=` to `/products`); mobile icon nav; Account → `/orders`; Cart button. Announcement bar below.
- **TabsBar**: a global tab strip exists but is *not rendered in the `(storefront)` layout* — it's a reusable component currently only used conceptually; the layout renders `StorefrontHeader` + `CartDrawer` + `StorefrontFooter`. The per-page category pills on `/products` are hand-rolled buttons, not `TabsBar`.
- **`lib/storefront-nav.ts`**: single-source registry of `Shop / Deals / Vendors / Orders / Wishlist / Help`. `/wishlist` and `/help` have **no pages** → broken nav.
- **Footer** (`StorefrontFooter.tsx`): links to `/products?deals=1`, `/about`, `/help` — `/about`/`/help` don't exist.
- **Operational**: `OperationalSidebar` drives admin (6 items) + vendor (4 items), hardcoded arrays.

**Problems:** no Home, no Categories, no user/account menu, no wishlist indicator, no notifications indicator, no dropdown/mega menus, duplicate nav definitions (header NAV_LINKS vs `storefront-nav.ts` vs footer vs sidebar), no active-state for `/deal` because `/products?deals=1` is the only "deals" entrypoint in the footer while the real `/deals` page uses a different URL pattern, and **no auth-driven nav gating** anywhere.

---

## 5. Existing Feature Inventory (backend reality, verified line by line)

**API endpoints that exist** (verified from controllers):
- `GET /api/health`, `/api/health/live`, `/api/health/ready`
- `GET /api/catalog` (`?includeInactive=true`), `GET /api/catalog/:id`, `GET /api/catalog/vendor/:vendorId` (`?includeInactive`), `POST /api/catalog`
- `POST /api/orders/checkout`, `GET /api/orders/:id`, `GET /api/orders/buyer/:buyerId`
- `POST /api/fulfillment/sync/:orderLineItemId`, `…/legacy`, `POST /api/fulfillment/vendor/:vendorId/configure`, `POST /api/fulfillment/reconcile`, `GET /api/fulfillment/queues/stats`, `GET /api/fulfillment/dead-letter`, `GET /api/fulfillment/ambiguous`
- `GET /api/inventory/:productId`
- `GET /api/admin/dashboard`, `GET /api/admin/orders?status=stuck`, `POST /api/admin/orders/:orderId/cancel`, `POST /api/admin/line-items/:lineItemId/resolve`, `GET /api/admin/dead-letter`, `POST /api/admin/dead-letter/:jobId/retry`, `GET /api/admin/audit-logs`, `GET /api/admin/trace/:correlationId`
- `POST /api/integrations/vendor-mock/config/:vendorId`
- `GET /api/dashboard/overview` (stub)

**Entities (6):** `Vendor`, `Product`, `Order`, `OrderLineItem`, `VendorSyncJob`, `AuditLog`.

**Backend logic present:** checkout transaction w/ row locks, inventory decrement/restore, sync job creation + processing + failure→DLQ, reconciliation, stuck-order detection, manual line-item resolution, dead-letter retry, audit read/write, vendor mock simulation, seed script (5 vendors, 25 products), load-test script.

**Frontend components present:** StorefrontHeader/Footer, TabsBar, CartDrawer, CatalogGrid, ProductCard, VendorCard, QuickViewModal, CheckoutForm, PhotoBlock, EmptyState, Skeleton, Toast, StatusBadge, Button, ErrorBoundary, RouteErrorFallback, OperationalSidebar, TelemetryCard, FulfillmentDataTable, DeadLetterInspector, AuditLogTimeline, FulfillmentMetricsChart, VendorQueueLatencyChart, NetworkStatusBanner, PollingIndicator, InventoryLockIndicator, ThemeController, ResolveLineItemDialog, AuditLogModal, Operational dashboard error states.

---

## 6. Missing Features (verified)

1. Product `category` column + category seeding + category API.
2. Backend endpoints frontend already calls (listed §2 / §15).
3. Authentication (login/register/session/JWT), roles (BUYER/VENDOR/ADMIN/OPERATIONS), guards, role-based nav.
4. Homepage.
5. Server-side catalog querying (search, filters, sort, pagination, aggregations) on `/api/catalog`.
6. Product-detail richness: gallery, reviews, specs, vendor, related/recs, recently-viewed, breadcrumbs.
7. Wishlist page + server persistence (optional at P1, local-to-server sync).
8. Account area (profile, addresses, notifications, security, preferences).
9. Checkout depth: address book, shipping method, tax, coupon, review, idempotency enforcement, payment abstraction.
10. Order depth: cancel-in-UI, reorder, timeline, per-line vendor status, invoice, shipment tracking, status filters.
11. Promotions + coupons (real entities + `/deals` driven by data).
12. Reviews & ratings (entity, aggregation, moderation).
13. Notifications (entity, center, unread count, preferences).
14. Vendor dashboard depth (product CRUD, analytics, promotions, settings).
15. Admin depth (products, customers, inventory, reconciliation ops, analytics, health, audit; real chart data).
16. Search UX (autocomplete, suggestions, recent/popular, no-results handling).
17. Recommendations (MVP: related/FBT/best-sellers/recently-viewed).
18. Frontend tests, Playwright E2E, CI test job.
19. Production env wiring (`NEXT_PUBLIC_API_BASE_URL`), prod smoke tests.
20. `/help`, `/about` routes to satisfy existing footer/nav links.

---

## 7. Recommended New Information Architecture

Keep the proven three-experience split (`(storefront)`, `(operational)`). Expand navigation:

```
BUYER STOREFRONT
  /                     Home (new homepage)
  /products             Shop (catalog w/ server-side query)
  /categories/[slug]    Category landing pages
  /deals                Promotions
  /new-arrivals         Curated recency rail (can reuse /products?sort=newest)
  /best-sellers         Curated sales rail (can reuse /products?sort=sold)
  /vendors              Vendor directory
  /vendors/[id]         Vendor storefront
  /products/[id]        Product detail
  /wishlist             Wishlist (page)
  /cart                 Optional standalone cart page (drawer remains primary)
  /checkout             Multi-step checkout
  /orders               Order history
  /orders/[id]          Order detail + tracking
  /account              Account hub (profile, addresses, notifications, security, preferences)
  /notifications        Notification center
  /help, /about         Fulfill existing links

VENDOR PORTAL (operational/vendor)
  /vendor/dashboard     Overview (existing + enrich)
  /vendor/products      Product CRUD
  /vendor/inventory     Stock health (existing + adjustment history)
  /vendor/orders        Fulfillment queue (existing + enrich)
  /vendor/analytics     Sales/orders/products metrics
  /vendor/promotions    Vendor promotions
  /vendor/dead-letter   DLQ (existing)
  /vendor/settings      Profile, policies, shipping

ADMIN CONSOLE (operational/admin)
  /admin                Overview (existing + enrich)
  /admin/orders         Orders (existing + filters)
  /admin/orders/[id]    Order detail (existing)
  /admin/products       Products table
  /admin/vendors        Vendors (existing + enrich)
  /admin/customers      Customers (new)
  /admin/categories     Categories (existing + enrich)
  /admin/inventory      Inventory health (new)
  /admin/fulfillment    Ops surface: queues, retries, DLQ, reconciliation (fold DLQ here + keep page)
  /admin/reconciliation Reconciliation run log/results
  /admin/dead-letter    DLQ (existing)
  /admin/analytics      GMV/revenue/vendor/customer analytics
  /admin/audit-logs     Audit (existing)
  /admin/health         System health (new)
  /admin/settings       Marketplace settings
```

**De-prioritize/park:** full ML recommendations, payment providers, search infra (Meilisearch/OpenSearch), microservices — all documented as future work only (§43 constraint).

---

## 8. Proposed Navigation Structure

**Desktop (top bar):**
```
[M] Marketplace        Home | Shop ▾ | Categories ▾ | Deals | New Arrivals | Best Sellers | Vendors
                      [🔍 Search…]  [♥ Wishlist n] [🔔 Notifications n] [Cart n]  [Account ▾]
                       Account ▾ = Sign in / My Account / My Orders / Wishlist / Become a Vendor / Admin Console(vendor+)
```
- **Shop ▾** dropdown: All products, subcategory quick links.
- **Categories ▾** dropdown/mega-menu: all categories from API with product counts, plus "New Arrivals / Best Sellers / Deals".
- User menu gated by auth (`BUYER` = account+orders+wishlist; `VENDOR` = + Vendor Portal; `ADMIN`/`OPERATIONS` = + Admin Console).
- Wishlist / notifications / cart badges show live counts from client stores + unread-notification API.

**Mobile (bottom sheet or hamburger):** same groups collapsed: Home / Shop / Deals / Vendors / Orders / Wishlist / Account; search as full-width field; category drawer.

**TabsBar unification:** render the global `TabsBar` once in `(storefront)/layout.tsx` from `STOREFRONT_NAV` (fix it so it only links to real pages). Remove the dead `/products?deals=1` footer link; point "Deals" to `/deals`.

**Single source of truth:** extend `lib/storefront-nav.ts` into `lib/navigation.ts` (typed registry: `{ href, label, Icon, role?, mobileInBottomNav?, dropdownItems? }`) consumed by header, tabs, footer, and mobile nav — no more duplicate arrays in 4 components.

---

## 9. Proposed Storefront Pages

| Page | Purpose → Key sections |
|---|---|
| **Home** `/` | Hero (brand + search + trust), featured categories, flash deals (promotion DB), trending (sold 7d), best sellers, new arrivals, featured vendors, recent-searches/products (local), trust bar (protected/verified/shipping), promo banner, newsletter, footer |
| **Shop** `/products` | Server-side filter/search/sort/pagination, filter sidebar (mobile sheet), result count, clear-all, skeletons |
| **Category** `/categories/[slug]` | Category hero + SEO, subcategory chips, products (server-paginated) |
| **PDP** `/products/[id]` | Gallery, buy box, vendor card + rating, specifications, reviews (sort/filter), related, FBT, recently viewed |
| **Deals** `/deals` | Real promo-driven sections (today's deals, biggest discount %, ending soon, category/vendor deals) |
| **Bestsellers/New arrivals** | Rails off `/products?sort=` + curated landing |
| **Vendors** `/vendors`, `/vendors/[id]` | Richer data-driven profiles (category, rating, policies, returns, shipping) |
| **Wishlist** `/wishlist` | Item list w/ price/stock state, move-to-cart, remove, clear-all, empty state |
| **Cart** drawer (primary) + optional `/cart` page | Vendor grouping, save-for-later, stale price/stock resolution |
| **Checkout** `/checkout` | Stepper: address → shipping → review → confirm → success (idempotent) |
| **Orders** `/orders`, `/orders/[id]` | Filterable history, timeline, per-line vendor status, reorder, cancel, invoice |
| **Account** `/account`, `/account/…` | Profile, addresses, notifications, security, preferences |
| **Help/About** | Static editorial pages |

---

## 10. Proposed Buyer Pages

Account hub + dashboard: `/account` (profile, order summary, recent activity), `/account/orders`, `/account/wishlist`, `/account/addresses`, `/account/notifications`, `/account/security`, `/account/preferences`, `/account/recently-viewed`. A buyer `/dashboard` (GMV-lite: spending, order stats, loyalty signals) is a P2 nicety folded into `/account` to avoid page explosion.

---

## 11. Proposed Vendor Pages

`/vendor/dashboard` (enrich existing), `/vendor/products` (CRUD, activate/deactivate, price/stock, images), `/vendor/inventory` (existing + adjustment log, low/out-of-stock), `/vendor/orders` (existing + per-line actions), `/vendor/analytics` (sales by product, orders/day, sync health), `/vendor/promotions`, `/vendor/dead-letter` (existing), `/vendor/settings`.

---

## 12. Proposed Admin/Operations Pages

`/admin` (overview enriched with real data + real charts), `/admin/orders` (+full filter set), `/admin/orders/[id]`, `/admin/products`, `/admin/vendors`, `/admin/customers`, `/admin/categories`, `/admin/inventory`, `/admin/fulfillment` (queue stats, stuck, reties), `/admin/reconciliation` (run + history), `/admin/dead-letter`, `/admin/analytics`, `/admin/audit-logs`, `/admin/health`, `/admin/settings`.

---

## 13. Proposed Tabs / Navigation Hierarchy

- **Global storefront TabsBar** (rendered in `(storefront)/layout.tsx`): Home · Shop · Deals · Vendors · Orders · (Wishlist) — data from `lib/navigation.ts`, active state via pathname.
- **Header nav**: primary links + dropdowns; user menu; badges.
- **Category tabs on `/products`** → server data from `/api/catalog/categories` (counts), not hardcoded.
- **Account sub-tabs** inside `/account/layout.tsx`.
- **Vendor/Admin sidebar** nav driven by a single `lib/operational-nav.ts` registry (role-scoped), replacing hardcoded arrays.

---

## 14. UI Component Architecture

Extend the existing system — do not rebuild it.

**New shared primitives (in `components/ui/`):** `Select`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Dialog`, `DropdownMenu`, `Breadcrumb`, `Pagination`, `Stepper`, `Tabs`, `Accordion`, `Badge`, `Avatar`, `Rating`, `StarRating`, `PriceTag`, `SearchBar`, `ProductImage` (replace raw PhotoBlock usages where images land), `DataTable` (refactor already-good `FulfillmentDataTable` into a generic wrapper), `SkeletonBlock` variants, `InlineAlert`, `ConfirmDialog`, `EmptyState` (extend with action variants), `ErrorState` (with retry), `CopyButton`, `Field/FormMessage`.

**Composed feature components:** `ProductCard` (extend: discount badge, rating, image), `CatalogGrid` (accept `variant` for rails), `HomeSections`, `RelatedProducts`, `ReviewList`, `ReviewForm`, `CheckoutSteps`, `AddressForm`, `OrderTimeline`, `NotificationItem`, `PromoCard`.

**State layer:** keep Zustand cart + wishlist; add `useUser` (auth context), `useNotifications`, `useRecentlyViewed` (localStorage), `useAddresses`; keep TanStack Query as the server-cache layer for all catalog/orders/dashboard reads (it's already a dependency, underused).

**Design tokens:** reuse `globals.css`/`lib/theme.ts`; add spacing/typography utilities only if gaps appear. All icons via lucide-react. All new code must pass the existing rules: no raw hex, no Tailwind palette classes outside `status-tokens.ts`, `StatusBadge` for statuses, `hydrated` gating for persisted stores.

---

## 15. Backend / API Expansion

**Build first (blocking — current UI is written against these):**
- `GET /api/catalog/categories` → `[{ name, slug, productCount, activeProductCount }]`
- `POST /api/catalog/categories`
- `GET /api/catalog/vendors` (buyer directory)
- `GET /api/catalog/vendors/admin` (admin detail list)
- `GET /api/catalog/vendor/:vendorId/detail`
- `GET /api/catalog/vendor/:vendorId/dashboard` (vendor portal KPIs)
- `GET /api/catalog/vendor/:vendorId` (exists) — keep
- `PATCH /api/catalog/:id` (update name/price/stock/isActive) + `DELETE /api/catalog/:id` (soft)
- `POST /api/catalog/seed` (move seed behind an admin-guarded endpoint, or remove the buyer-facing seed button; keep the CLI seed)
- `GET /api/orders/vendor/:vendorId`
- `POST /api/orders/:id/transition`, `POST /api/orders/:id/cancel` (wire existing `OrdersService.cancelOrder` — the backend method exists, the route does not)
- `GET /api/orders` (buyer's own, from auth token, not a client-supplied id)

**Catalog query upgrade (P1):** extend `GET /api/catalog` with server-side `q, category, categories[], vendorId, minPrice, maxPrice, inStock, ratingMin, discountMin, sort (featured|newest|price_asc|price_desc|rating|bestselling|discount), page, pageSize` → `{ items, total, page, pageSize, facets { categories[], vendors[], priceRange, maxPrice } }`. Never do this client-side.

**Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/refresh` (or session). `User` entity with `role`. Guard decorators `@Roles(ROLES.BUYER)` etc. Buyers' orders/cart/wishlist derived from `req.user.id` server-side.

**Commerce (P1):** `Cart`/`CartItem` (server, merged with local on login), `Address` CRUD, `ShippingMethod`, `PaymentIntent` (abstraction), `Coupon` validate/apply, checkout upgrade (revalidate stock+price, tax+shipping calc), idempotency enforcement on `idempotencyKey`.

**Marketplace (P1/P2):** `Wishlist` server sync, `Review` (+aggregate rating on product/vendor reads), `Promotion`/`PromotionItem`, `Order` shipment fields + timeline events, `Notification` (create from order/sync/reconciliation events), `RecentlyViewed` (server or keep local), `AnalyticsController` (aggregations), vendor product CRUD endpoints, admin product/customer/inventory endpoints.

**General:** all multi-entity writes stay transactional; never weaken locks; cache category/vendor/read-heavy GETs in Redis (short TTL) rather than adding infra; keep correlation-ID on every write.

---

## 16. Database Expansion

Current (6 tables): `vendors`, `products`, `orders`, `order_line_items`, `vendor_sync_jobs`, `audit_logs`.

| Change | Entity | Status | Priority |
|---|---|---|---|
| `Product.category` + `Product.slug`/images | Product | ENHANCE | P0 |
| `Vendor` profile fields (slug, logo, description, policies, rating aggregate, category) | Vendor | ENHANCE | P1 |
| `Order` shipment fields (carrier, tracking, shipped_at), `order_number` unique (exists as migration — unify into runner) | Order | ENHANCE | P1 |
| `User` (+role BUYER/VENDOR/ADMIN/OPERATIONS), `RefreshToken` or session | User | NEW | P0 |
| `Category` (slug, name, parentId, sortOrder, iconKey) + many-to-many or `product.categoryId` | Category | NEW | P0 |
| `Address` (user, label, line1/2, city, state, zip, country, default) | Address | NEW | P1 |
| `Server Cart` / `CartItem` | Cart | NEW | P1 (optional; local-first P0) |
| `WishlistItem` (user, product) | Wishlist | NEW | P1 |
| `Review` (user, product, vendor, rating 1–5, title, body, verifiedPurchase, status) | Review | NEW | P1 |
| `Notification` (user, type, payload, readAt) | Notification | NEW | P2 |
| `Promotion` + `PromotionItem` (discount type %, fixed, min qty, window, status) | Promotion | NEW | P2 |
| `Coupon` + `CouponRedemption` (code, type, value, minOrder, usageLimit, used, expiry) | Coupon | NEW | P1 |
| `AuditLog` — add index on `(entity_type, entity_id)` | AuditLog | ENHANCE | P0 |
| `OrderTimelineEvent` (order, event, payload, at) | OrderTimelineEvent | NEW | P1 |
| `Shipment` (if carried beyond Order fields) | Shipment | NEW | P3 |

**Migration discipline:** after P0, stop relying on `synchronize` for prod. Extend the migration runner to include `order_number` migration; adopt `npm run migration:generate` for every schema change; add indexes on `products(category, is_active)`, `products(vendor_id)`, `orders(buyer_id, created_at)`, `order_line_items(order_id)`, `audit_logs(correlation_id)`, `notifications(user_id, read_at)`.

---

## 17. Authentication / Authorization Plan

- **MVP (P0):** JWT (access + refresh) or server session; `User.entity` with `role`. `POST /api/auth/*`. `AuthGuard` + `@Roles()` decorator + global guard applying role checks. On the frontend: `AuthContext` → provide `{ user, token, login, logout }`; `useAuth`; gate nav + route groups. `useRoleGuard` reworked to read the real auth context, and `(operational)` layouts require `vendor`/`admin` roles.
- **Roles:** `BUYER`, `VENDOR`, `ADMIN`, `OPERATIONS`. Role matrix on routes (public / any-authed / vendor / admin / operations) in a single `lib/rbac.ts` on frontend + `roles` map on backend guards.
- **Seed demo users** for each role to keep the demo usable (documented in seed).
- Middleware approach for Next (`middleware.ts`) is optional given per-page client guards + server-side checks by the API; keep it simple: API is the authority, frontend guards are UX.

---

## 18. Search Plan

**MVP (P0/P1, no infra):** server-side ILIKE/coalesce search over name+vendor+category in `GET /api/catalog?q=`; typeahead endpoint `GET /api/catalog/autocomplete?q=` returning `{ products, vendors, categories }` (top 5 each); recent searches stored locally (localStorage) + popular searches (admin-configured or derived from recent-searches/events); no-results state with suggestions and clear-filters. Keep relevance simple: prefix match > substring, weighted (name > category > vendor), then price/newest tiebreak.

**Future (documented, not built):** dedicated search engine (Meilisearch/OpenSearch), full-text, typo tolerance, faceting, personalization. Explicitly P3.

---

## 19. Deals / Promotions Plan

- `Promotion` + `PromotionItem` entities; `Promotion` has `title`, `promotionType` (`flash|category|vendor|sitewide`), `discountType` (`percent|fixed`), `value`, `minQuantity?`, `startsAt`, `endsAt`, `status`.
- `/deals` reads `GET /api/promotions/active` → sections: today's/favorite/flash (ending soon), biggest % off, category deals, vendor deals. Product cards show original price, discounted price, % off, badge, ending-soon countdown, stock-urgency.
- Discount resolution helper shared between frontend display and backend checkout (single `priceAfterDiscount` util server-side; frontend mirrors).
- `Coupon` + `CouponRedemption`: `applyCoupon` validates (usage limit, expiry, min order, vendor/category scope), checkout applies and records redemption once (idempotent).
- Leave the existing honest "lowest-priced third" fallback behind as the empty-promotion state.

---

## 20. Cart / Checkout Plan

**Cart:** keep drawer as primary; add save-for-later bucket in store; on cart open and at checkout, call `/api/catalog/price-stock?ids=…` (or per-item GET) and surface "price changed / no longer available / only X left" with resolution actions. Vendor grouping already modeled — render vendor sections with per-vendor subtotals.

**Checkout (multi-step):** Cart → Address (saved addresses + new) → Shipping method (from backend config, test-only) → Review (items, prices that were revalidated, tax, shipping, coupon, total) → Pay (abstraction; "test mode" success/decline) → Confirmation.
- Backend `checkout` evolves: keep the exact transaction/locking pattern; add (a) enforce `idempotencyKey` (unique order on key), (b) price revalidation from DB (return 409 conflict list on mismatch), (c) tax + shipping calculation, (d) coupon application + redemption, (e) optional payment-capture stub before order placement in the same transaction.
- **Payment:** abstraction `PaymentProvider` interface with a `MockPaymentProvider` (succeeds/declines by test card pattern or config) — no real provider wires (matches PRD non-goal).

---

## 21. Orders Plan

- History: status filter tabs, server pagination, order cards/table, "Reorder" (rebuild cart), "Cancel" (only pre-fulfillment; wire existing backend `cancelOrder` which restores stock — ensure route + auth exist), "Invoice" view.
- Detail: timeline from `OrderTimelineEvent` (and/or audit logs), per-line-item vendor + fulfillment + sync status (data already exists), tracking number/status when shipped (mock carrier), support action (mailto / ticket stub).
- Clearly map statuses to the existing `status-tokens.ts` vocabulary — order (`PLACED→CONFIRMED→FULFILLING→FULFILLED|CANCELLED|FAILED`), line-item (`pending→syncing→confirmed→failed→dead_letter→ambiguous`), sync (`pending→in_progress→completed|failed|dead_letter|ambiguous`).
- Confirmation screen: order#, links to tracking; store idempotency key so refresh doesn't duplicate.

---

## 22. Vendor Plan

- Public storefront: richer profile (bio, logo, policies, returns, shipping, rating from reviews), products grid, "ask a question" stub.
- Portal: products CRUD (create/update/soft-delete), inventory adjustments with audit trail (reuse `restoreStock`-style transaction + `AuditService`), orders queue with transition per line item, promotions, analytics (orders/day, revenue, conversion, sync health), settings (policies/shipping).
- Role-gate entire `(operational)/vendor/*` and scoped data to the authenticated vendor (never `VENDOR_ID` constant after auth lands).

---

## 23. Fulfillment / Operations Plan

The backend lifecycle is already: Order → Queue → Vendor Sync → Success, and → Failure → Retry → DLQ → Reconciliation. The UI must expose this:

- **Vendor portal /orders + /dead-letter:** order row → per-line-item columns (status, attempts, lastAttempted, vendorReference, failureReason), manual "trigger sync" for pending, DLQ inspector with "retry" (existing APIs).
- **Admin /fulfillment + /reconciliation + /dead-letter:** queue stats (existing `/fulfillment/queues/stats`), stuck orders table (existing `/admin/orders?status=stuck`), run reconciliation + show result, DLQ retry/resolve (existing), an ops timeline (existing audit trace). Replace the **mock chart data** on `/admin` with real endpoints (see Analytics).
- Add "retry queued" visual state handled by BullMQ events (optional polling).

---

## 24. Notifications Plan

- `Notification` entity + `GET /api/notifications?unreadOnly&page`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`, unread-count endpoint.
- Event producers (MVP): order confirmed, order shipped (mock), payment declined, low-stock (vendor), wishlist price drop, promotion ending soon (cron), vendor sync failure / DLQ (ops+admin), reconciliation anomaly (admin).
- UI: bell in header (badge), `/notifications` center, mark-read on click, per-type preferences stored on `User` (JSON column or `NotificationPreference` table).

---

## 25. Recommendation Plan

- **MVP (P1):** related (same category, exclude self) on PDP; best sellers (order-line-item count 30/90d) rail; same-vendor products rail; recently-viewed rail (localStorage list of product ids with clip at N); FBT heuristic (items co-bought in same orders).
- **Future (documented):** behavior-based collaborative filtering, ML embeddings, personalize home — all P3, no infra above Redis/PG.

---

## 26. Testing Strategy

**Frontend (currently zero — add):** Vitest + React Testing Library for components (ProductCard discount/render states, CatalogGrid empty/skeleton, cart store reducers, checkout validation via RHF/zod, filters/URL state, role guard). MSW for API mocking. Playwright E2E: happy-path login → browse → filter → cart → checkout → order detail polling; wishlist; admin resolve-line-item; vendor DLQ retry. Add a CI test job (`npm test`) to `ci-cd.yml`.

**Backend (extend existing jest suite):** unit specs for auth guard/RBAC, coupon validation, tax/shipping calc, price-after-discount, promotion window logic. Integration/E2E: extend `order-lifecycle.e2e-spec.ts` + `concurrency.spec.ts` for checkout with coupons + idempotency + price-conflict 409s; vendor sync retry→DLQ→reconcile→resolve; notifications on order transitions. Keep the correlation-id assertion pattern.

**Regression:** cross-browser smoke (Chrome/FF/Webkit) on the 4 primary journeys; the PRD's concurrency invariant (no oversell) must remain a failing-if-regressed test.

---

## 27. Performance Strategy

Server-side pagination + filters (SQL), indexes (listed §16), eager single-query aggregates for dashboards, Redis TTL cache for categories/vendor directory/popular searches, `cacheControl`/`staleTime` on TanStack Query (already present for orders — extend to catalog), image `next/image`-optimized when real images land (current config uses `unoptimized:true`; revisit), lazy-load below-the-fold home rails, React.lazy for checkout/dashboards, avoid re-fetch-all-catalog anywhere post-P0. No premature infra.

---

## 28. Accessibility Strategy

Maintain the existing strong baseline (the code already uses semantic elements, `aria-current`, labels, Radix focus traps, focus-visible rings, `prefers-reduced-motion`). Add: full keyboard nav for dropdowns/mega menus and mobile nav, ARIA labels/`aria-expanded` on cart/wishlist/bell toggles, contrast check on brass-on-ivory small text (brass `#a9803f` on ivory fails AA at small sizes — use ink-navy text for body, brass only for accents/underlines already handled), focus-visible states on all new components, `role="status"`/`aria-live` for toasts and count badges (partially present), screen-reader-friendly empty/error states, skip-to-content link.

---

## 29. SEO Strategy

Home, categories, products, vendors, deals: `generateMetadata` per page (title + description), canonical URLs, `OpenGraph` + basic JSON-LD for `Product` (price, availability, seller) and `Organization` on home. Dynamic titles via the existing `metadata` template (`"%s | Marketplace"`). `sitemap.ts` + `robots.txt`. Keep `/products` index-relevant; add `og:image` when real imagery exists.

---

## 30. Deployment Strategy

Target topology (unchanged providers):

```
LOCAL → CI (gha: lint/typecheck/test/build) → VERCEL (frontend) + RAILWAY (backend API) → Postgres(Supabase) + Redis(Railway/managed)
```

**Fix the production API URL (P0, explicitly requested):**
- Set `NEXT_PUBLIC_API_BASE_URL=https://<railway-api-host>/api` as a **Vercel env var at build time** (project settings or `vercel.json` `build.env`). Remove reliance on `apps/frontend/.env.local` (which is UTF-16 and local only).
- Better: make `/api` calls go through a **Next.js rewrite** (`next.config.ts` `rewrites` to `process.env.API_PROXY_TARGET`) so the browser always calls same-origin `/api/*` and the header/CORS mess disappears; keep `NEXT_PUBLIC_API_BASE_URL` only as the SSR/proxied upstream. This also fixes CORS entirely.
- Keep backend CORS allowing the Vercel origin (pin origin allow-list to the real domain once known).
- Add `/api/health`-based **production smoke test** (GH Action) hitting the deployed API and the deployed frontend (status 200, expected shell text).
- `.env.example`: document `DATABASE_URL`, `REDIS_URL`, `PORT`, and all `NEXT_PUBLIC_*`; verify the root `.env` load paths in `ConfigModule` cover Railway.
- Revert/absorb the UTF-16 `.env.local` and remove `dev.err/dev.out/dev.log/backend.stderr/stdout` artifacts from the repo.
- CI: add test job; fix the YAML indentation bug already visible in `deploy-frontend` (`vercel-org-id` line).

---

## 31. Phase-by-Phase Implementation Roadmap

> Each phase leaves the app compiling, type-checking, and functionally intact. **No phase touches the checkout transaction, row locks, sync/retry/DLQ, or reconciliation logic.**

### Phase 0 — Existing-system audit (foundation)
**Objective:** Reconcile frontend↔backend contract; remove dead artifacts; fix env.
**Features:**
- Enumerate every `lib/api.ts` function vs authenticated backend routes; produce the gap list (this doc is that list) and fix the versions.
- Remove `apps/frontend/.env.local` UTF-16 artifact; wire `NEXT_PUBLIC_API_BASE_URL` via Vercel env/rewrite; delete stray logs (`*.out/*.err/*.log` at root and `apps/backend/*stdout/stderr/logs`).
- Add CI test job.
**Frontend files:** `next.config.ts`, `lib/api.ts` (contract cleanup), remove seed button from `/products` (or gate behind admin).
**Backend files:** `main.ts` (CORS allow-list), `app.module.ts` (register new modules as created), `.env.example`.
**DB changes:** none (contract freeze).
**API changes:** none new this phase.
**Dependencies:** none.
**Testing:** CI gate green + manual storefront smoke.
**Acceptance:** `lib/api.ts` routes 1:1 with controllers; production URL resolution verified (deployed page fetches deployed API); CI runs tests.
**Risks:** touchy deployment config. **Complexity:** LOW.

### Phase 1 — Authentication + RBAC (foundation II)
**Objective:** A real `User` + roles; every user-scoped surface keyed to `req.user`.
**Features:** `User` entity (role enum BUYER/VENDOR/ADMIN/OPERATIONS), register/login/me/logout/refresh, `AuthGuard` + `@Roles`, frontend `AuthContext`/`useAuth`, redone `useRoleGuard`, seeded demo users, gate `(operational)` route groups + header account menu.
**Frontend files:** `lib/auth-context.tsx`, `lib/hooks/use-role-guard.ts` (rework), `lib/rbac.ts`, `app/(operational)/admin/layout.tsx`, `app/(operational)/vendor/layout.tsx`, `components/storefront/StorefrontHeader.tsx` (account menu), new `components/auth/*`.
**Backend files:** new `src/auth/*` (module), `src/common/entities/user.entity.ts`, `src/common/guards`/decorators, `src/database/seed.ts` (add users).
**DB changes:** NEW `users` (+refresh_tokens) migration.
**API changes:** `POST/GET /api/auth/*`.
**Dependencies:** `@nestjs/jwt`, `bcrypt` (or argon2), `@nestjs/passport`/passport or hand-rolled guard.
**Testing:** auth unit + e2e (login/me/roles denied), frontend guard behavior.
**Acceptance:** unauthenticated ops routes redirect; vendor/admin data is role-scoped.
**Risks:** JWT/session choice. **Complexity:** HIGH.

### Phase 2 — Categories + catalog contract (foundation III)
**Objective:** Make the current UI's missing endpoints work; add `category` and server-side querying.
**Features:** Add `Product.category`+`slug`, `Category` entity; `GET /api/catalog/categories`; category seeding; server-side `GET /api/catalog?...` (q, category, vendor, price, sort, page); `PATCH/DELETE /api/catalog/:id`; `POST /api/catalog/seed` (guarded); buyer vendor directory endpoints; order transition/cancel/vendor-list routes; `/orders` for own-token user.
**Frontend files:** `lib/api.ts` (reconcile), `lib/types.ts` (add fields), `app/(storefront)/products/page.tsx` (server-driven, remove redundant client filter), `components/ui/Select.tsx`, pagination, category data in `TabsBar`.
**Backend files:** new `src/catalog/dto` query DTO, `catalog.service.ts` (query builder with filters/sort/pagination/facets), `catalog.controller.ts`, `src/common/entities/category.entity.ts`, orders controller routes.
**DB changes:** NEW `categories`; ENHANCE `products` (`category`, `slug`); migration + seed update (assign categories to 25 products).
**API changes:** catalog query params + facets; vendor/category endpoints; order routes.
**Dependencies:** none (TypeORM query builder).
**Testing:** catalog query integration specs; e2e category filter.
**Acceptance:** `/products` filters/sorts/paginates server-side; category tabs show live counts; all api.ts functions 200.
**Risks:** PII none; index/perf. **Complexity:** HIGH.

### Phase 3 — Design-system shell + navigation + home (IA)
**Objective:** Richer IA, unified nav, real homepage.
**Features:** `lib/navigation.ts` single registry; header dropdowns (Shop, Categories mega menu), mobile nav, TabsBar rendered globally, wishlist/notification/cart badges, `/` homepage (hero, categories, flash deals, bestsellers, new arrivals, featured vendors, trust bar, footer), `/help`, `/about`.
**Frontend files:** `components/storefront/*` (nav, SearchBar, mega menu, HomeSections), `app/(storefront)/layout.tsx`, `app/page.tsx` (replace redirect), `app/(storefront)/about/page.tsx`, `app/(storefront)/help/page.tsx`.
**Backend files:** `GET /api/catalog/categories` (home rails reuse), recommendations-lite endpoint for rails (best sellers via order_line_items).
**DB changes:** none beyond indexes.
**API changes:** maybe `GET /api/recommendations/rails`.
**Dependencies:** none (Radix dropdown).
**Testing:** Vitest for nav registry + menu a11y; Playwright home smoke.
**Acceptance:** nav has no dead links; home renders with data; responsive breakpoints.
**Risks:** none major. **Complexity:** MEDIUM.

### Phase 4 — Search + filters + product listing depth
**Objective:** Real discoverability.
**Features:** Autocomplete endpoint + SearchBar typeahead, recent/popular searches, facets UI (category, vendor, price range, in-stock, rating, discount), result count, clear-all, skeleton loaders, no-results guidance, pagination.
**Frontend files:** `components/storefront/SearchBar.tsx`, `app/(storefront)/products/page.tsx` (facet sidebar, mobile sheet), `lib/hooks/use-debounced-…`, pagination component.
**Backend files:** `catalog.service.ts` autocomplete method + `GET /api/catalog/autocomplete`; facets aggregation in query.
**DB changes:** indexes; `tsvector` optional later.
**API changes:** autocomplete + facets.
**Dependencies:** none.
**Testing:** unit for facet parsing, e2e search→filter→paginate.
**Acceptance:** keyboard-friendly autocomplete with suggestions; all filters combined correctly; URL state.
**Risks:** none. **Complexity:** MEDIUM.

### Phase 5 — Product detail + vendor storefront depth
**Objective:** Conversion-rich PDP + vendor presence.
**Features:** image gallery, specs, buy box (discount, availability, qty, add/buy, wishlist), vendor card + rating, related / same-vendor / FBT / recently-viewed rails, reviews (see Phase 12 for entity work — render stubs first if needed), breadcrumbs; vendor storefront depth (bio/policies).
**Frontend files:** `app/(storefront)/products/[id]/page.tsx` (extend), `components/product/*`, `components/storefront/VendorCard`, `app/(storefront)/vendors/[vendorId]/page.tsx`.
**Backend files:** possibly `GET /api/catalog/:id` enrich (image, description, rating aggregate), `GET /api/recommendations/related`.
**DB changes:** ENHANCE `products` (description, images JSON, rating aggregate once reviews exist).
**API changes:** PDP enrich + related.
**Dependencies:** none.
**Testing:** PDP e2e add-to-cart/buy-now/wishlist; rails empty-state.
**Acceptance:** PDP complete; no dead rails; URL indexable.
**Risks:** none. **Complexity:** MEDIUM.

### Phase 6 — Cart depth + wishlist page
**Objective:** Server-aware cart + saved-items page.
**Features:** price/stock revalidation on open + at checkout; save-for-later; wishlist page (price/stock indicators, move-to-cart, clear); optional server cart sync at login.
**Frontend files:** `app/(storefront)/wishlist/page.tsx`, `context/CartStore.ts` (extend: saveForLater, validation), `components/storefront/CartDrawer.tsx` (states), header badge.
**Backend files:** (optional server cart) `src/cart/*`.
**DB changes:** (optional) `wishlist_items`.
**API changes:** (optional) wishlist/cart server endpoints.
**Dependencies:** none.
**Testing:** store unit tests; e2e wishlist→cart.
**Acceptance:** cart surfaces "price changed / no longer available"; wishlist page functional.
**Risks:** local-vs-server cart merge complexity → P1 server cart optional. **Complexity:** MEDIUM.

### Phase 7 — Checkout + transactional order flow
**Objective:** Production checkout.
**Features:** multi-step (address book → shipping → review → payment stub → confirm), tax/shipping calc, coupon apply, idempotency enforcement, price-conflict 409 UI, payment abstraction w/ mock provider, confirmation.
**Frontend files:** `app/(storefront)/checkout/page.tsx` (stepper), `components/checkout/*` (AddressForm, ShippingStep, ReviewStep, PaymentStep), `components/storefront/CheckoutForm.tsx` (refactor), `lib/api.ts` (coupons, shipping).
**Backend files:** `src/orders/orders.service.ts` (extend checkout without touching locks), new `src/checkout/*` or in orders: addresses, shipping, tax, coupons, `PaymentProvider` + `MockPaymentProvider`, idempotency.
**DB changes:** NEW `addresses`, `coupons`, `coupon_redemptions`, order shipment/payment fields.
**API changes:** `POST /api/checkout` (v2 or evolve), `GET/POST /api/addresses`, `POST /api/coupons/validate`.
**Dependencies:** none (no payment SDK).
**Testing:** extend concurrency + e2e: coupon+idempotency+decline; frontend stepper e2e.
**Acceptance:** order creation remains atomic; duplicate submit creates one order; coupon once; payment decline path clear.
**Risks:** HIGH — must not regress locking/transaction. Mitigate with the existing concurrency suite as gate.
**Complexity:** VERY HIGH.

### Phase 8 — Buyer account + orders depth
**Objective:** Account hub + rich order history.
**Features:** `/account` (profile, addresses, security, preferences, notifications link), orders filter/reorder/cancel/invoice, order timeline + per-line vendor status, shipment tracking stub.
**Frontend files:** `app/(account)/*` route group (or under storefront), `components/order/*`, dispatch in `app/(storefront)/orders/*`.
**Backend files:** `POST /api/orders/:id/cancel` (wire), `GET /api/orders/:id` enrich (timeline), `POST /api/orders/:id/reorder`.
**DB changes:** `order_timeline_events`.
**API changes:** cancel/reorder/timeline.
**Testing:** cancel-restores-stock integration; timeline ordering.
**Acceptance:** cancel only pre-fulfillment; reorder rebuilds cart; history paginated.
**Risks:** LOW. **Complexity:** MEDIUM.

### Phase 9 — Deals, coupons, promotions
**Objective:** Data-driven `/deals` + checkout coupons.
**Features:** promotion CRUD (admin), `/deals` sections driven by API, discount badges on cards, countdown/urgency, coupon codes.
**Frontend files:** `app/(storefront)/deals/page.tsx` (rebuild), generate `ProductCard` discount badge, admin promotions screen.
**Backend files:** `src/promotions/*` + coupon validation in checkout.
**DB changes:** NEW `promotions`, `promotion_items`; NEW `coupons`, `coupon_redemptions`.
**API changes:** `GET /api/promotions/active`, admin CRUD; coupon apply endpoints.
**Testing:** promotion window + discount math unit; e2e deals→checkout with code.
**Acceptance:** deals reflect DB; discount shown consistently everywhere; coupon idempotent.
**Risks:** price calc duplication → shared util. **Complexity:** MEDIUM.

### Phase 10 — Vendor dashboard depth
**Objective:** Full vendor portal.
**Features:** product CRUD, inventory adjustments + history, orders queue transitions, analytics (orders/revenue/sync), promotions, settings; role-scoped server-side (stop using `VENDOR_ID`).
**Frontend files:** `app/(operational)/vendor/*` new pages, `components/vendor/*`.
**Backend files:** vendor-scoped catalog/order/analytics endpoints; scoping guard `@VendorScope()`.
**DB changes:** ENHANCE `vendors` (bio/policies/settings), `inventory_adjustments` maybe.
**API changes:** vendor product CRUD, analytics, settings.
**Testing:** vendor RBAC e2e; inventory adjustment audit.
**Acceptance:** a vendor portal admin can fully run their store.
**Risks:** scope-leak → server-side enforcement. **Complexity:** HIGH.

### Phase 11 — Admin console + operations depth
**Objective:** Full admin/ops.
**Features:** real chart data; products/customers/inventory tables; reconciliation run+history; health/settings; category & vendor enrich; audit explorer polish.
**Frontend files:** `app/(operational)/admin/*` new pages, real data hooks replacing mock chart data in `app/(operational)/admin/page.tsx`.
**Backend files:** `GET /api/admin/analytics`, `/api/admin/products`, `/api/admin/customers`, `/api/admin/reconciliation`, `/api/admin/health`.
**DB changes:** indexes for aggregates.
**API changes:** admin analytics + resources.
**Testing:** admin e2e flows; analytics aggregation specs.
**Acceptance:** admin can run the marketplace end-to-end from UI.
**Risks:** none major. **Complexity:** HIGH.

### Phase 12 — Reviews, notifications, recommendations
**Objective:** Social + operational signal.
**Features:** review create/list/moderation, rating aggregates on product/vendor/order, notification center + unread badge, event producers, recommendations rails (related/FBT/bestsellers/recently-viewed).
**Frontend files:** `components/product/ReviewList.tsx`, `ReviewForm.tsx`, `app/(storefront)/notifications/page.tsx`, header bell, rec rails components, PDP rails.
**Backend files:** `src/reviews/*`, `src/notifications/*`, `src/recommendations/*`.
**DB changes:** NEW `reviews`, `notifications` (+preferences); indexes.
**API changes:** review/notification/recommendation endpoints.
**Testing:** review = verified-purchase logic; notification read-state; recommendation SQL.
**Acceptance:** verified-purchase only after fulfillment; notifications mark-read; rails populated.
**Risks:** none. **Complexity:** MEDIUM.

### Phase 13 — Performance, accessibility, SEO polish
**Objective:** Hardening quality.
**Features:** server pagination everywhere, Redis caching of hot GETs, image optimization, code-splitting, perf budgets; full keyboard/a11y pass; SEO metadata/canonical/sitemap/OG/JSON-LD.
**Frontend files:** `lib/query-client.ts` (extend staleTime), middleware/robots/sitemap, metadata builders, a11y fixes.
**Backend files:** caching in services, index review.
**DB changes:** indexes.
**Testing:** a11y checks (axe), Lighthouse budget gate, robustness.
**Acceptance:** Lighthouse ≥ target; no a11y violations; sitemap/OG present.
**Risks:** none. **Complexity:** MEDIUM.

### Phase 14 — Production hardening + testing + deployment
**Objective:** Ship-ready.
**Features:** complete test suite (frontend Vitest+RTL+Playwright; backend expanded), CI test job, prod smoke tests, env/docs overhaul, remove dev artifacts, migration discipline (generate migrations, unify runner incl. order_number), load-test re-run (concurrency suite as gate), rollback plan.
**Frontend files:** `e2e/*`, `**/*.test.*`, `DEPLOYMENT.md`.
**Backend files:** expanded specs, migration runner updates, `ci-cd.yml` test job + indentation fix.
**DB changes:** generated migrations for Phases 1–12 (one consolidated set).
**Testing:** full suite green + concurrency invariant green.
**Acceptance:** CI+prod deploy green; smoke passes; zero-over-sell load test.
**Risks:** none. **Complexity:** MEDIUM.

### Phase 15 — Post-MVP future roadmap (documented only)
**Objective:** P3 backlog with no code. Search infra, ML recs, payments, analytics product, mobile apps, multi-currency/region. Write into `docs/ROADMAP.md`.

---

## 32. Dependency Graph

```
Phase 0 (contract + env)            Phase 1 (auth/RBAC)
        │                                  │
        └────────── Phase 2 (categories + catalog query)  ← both gate
                             │
        Phase 3 (nav/home) ——┼── Phase 4 (search/facets)
                    │                    │
             Phase 5 (PDP + vendor) ─────┘
                    │
             Phase 6 (cart/wishlist)   (P1 optional server cart)
                    │
             Phase 7 (checkout)   ← depends on 2,5,6
                    │
        ┌───────────┼───────────────┐
   Phase 8 (orders/account)      Phase 9 (deals/coupons)
              │                      │
        Phase 10 (vendor)  ──┐        │
        Phase 11 (admin/ops) ┤  Phase 12 (reviews/notifications/recs)
              └──────────────┼───────┘
                       Phase 13 (perf/a11y/seo)
                       Phase 14 (hardening/test/deploy)
                       Phase 15 (roadmap only)
```
**Parallelizable:** Phase 3 (nav/home) and Phase 4 (search/facets) can run alongside each other after Phase 2; Phases 10 and 11 fork after 8/9; Phase 12 rails can be partially scaffolded with Phase 5.

---

## 33. Priority Matrix

| Priority | Items |
|---|---|
| **P0 (foundation)** | Production API URL fix; contract reconciliation (missing endpoints); auth + RBAC; `Product.category` + Category entity + seeding; server-side catalog query; migration discipline; env/doc cleanup |
| **P1 (core marketplace)** | Homepage; search + facets + autocomplete; navigation IA; PDP richness; wishlist page; cart revalidation; multi-step checkout w/ idempotency + coupon + payment stub; order cancel/reorder/timeline; reviews; addresses; server cart/wishlist; vendor + admin dashboards |
| **P2 (important)** | Notifications center; real analytics; fulfillment/reconciliation ops UI; promotions engine; vendor analytics; admin resources (products/customers/inventory); frontend test suite; Playwright |
| **P3 (future)** | Search infra, ML recs, payment providers, multi-currency, mobile apps, wishlist price-drop via eventing, etc. |

---

## 34. File-Level Implementation Map

### `apps/frontend/`
**Existing — modify:** `lib/api.ts` (add/reconcile functions), `lib/types.ts`, `lib/storefront-nav.ts`→`lib/navigation.ts`, `lib/hooks/use-role-guard.ts` (auth-backed), `lib/query-client.ts`, `app/(storefront)/layout.tsx` (render TabsBar), `app/(storefront)/products/page.tsx` (server-driven + facets), `app/(storefront)/products/[id]/page.tsx`, `app/(storefront)/vendors/[vendorId]/page.tsx`, `app/(storefront)/deals/page.tsx`, `app/(storefront)/checkout/page.tsx`, `app/(storefront)/orders/[id]/page.tsx`, `app/(storefront)/orders/page.tsx`, `components/storefront/StorefrontHeader.tsx`, `CartDrawer.tsx`, `CatalogGrid.tsx`, `ProductCard.tsx`, `QuickViewModal.tsx`, `components/operational/FulfillmentDataTable.tsx` (generalize), `components/operational/OperationalSidebar.tsx` (registry), `app/(operational)/admin/page.tsx` (real data), `app/(operational)/vendor/dashboard/page.tsx`, `.env.local` (delete/repurpose), `package.json` (add test deps), `next.config.ts` (rewrites/API proxy), `app/page.tsx` (homepage not redirect).

**New — create:**
- `app/page.tsx` (home section components) → `components/home/*`
- `app/(account)/…` (or under storefront) `/account`, `/account/orders`, `/account/addresses`, `/account/notifications`, `/account/security`, `/account/preferences`, `/account/recently-viewed`
- `app/(storefront)/wishlist/page.tsx`
- `app/(storefront)/categories/[slug]/page.tsx`
- `app/(storefront)/notifications/page.tsx`
- `app/(storefront)/about/page.tsx`, `app/(storefront)/help/page.tsx`
- `app/(storefront)/cart/page.tsx` *(optional)*
- `app/(operational)/vendor/products/page.tsx`, `/analytics`, `/promotions`, `/settings`
- `app/(operational)/admin/products/page.tsx`, `/customers`, `/inventory`, `/fulfillment`, `/reconciliation`, `/analytics`, `/health`, `/settings`
- `components/ui/`: `select.tsx`, `input.tsx`, `dropdown-menu.tsx`, `breadcrumb.tsx`, `pagination.tsx`, `stepper.tsx`, `tabs.tsx`, `accordion.tsx`, `avatar.tsx`, `rating.tsx`, `badge.tsx`, `dialog.tsx` (generalize existing), `confirm-dialog.tsx`, `inline-alert.tsx`, `error-state.tsx` (with retry), `skeleton-block.tsx`
- `components/product/`: `review-list.tsx`, `review-form.tsx`, `specs-table.tsx`, `related-products.tsx`, `frequently-bought-together.tsx`, `recently-viewed.tsx`, `image-gallery.tsx`
- `components/auth/`: `login-form.tsx`, `register-form.tsx`, `account-menu.tsx`
- `components/checkout/`: `address-form.tsx`, `shipping-step.tsx`, `review-step.tsx`, `payment-step.tsx`
- `components/notification/`: `notification-center.tsx`, `notification-item.tsx`, `notification-bell.tsx`
- `lib/auth-context.tsx`, `lib/rbac.ts`, `lib/navigation.ts` (rework of storefront-nav), `lib/operational-nav.ts`, `lib/recently-viewed.ts`, `lib/format.ts` (currencies/percent), `lib/hooks/use-debounced-value.ts`, `lib/hooks/use-notifications.ts`
- `e2e/*.spec.ts`, `components/**/*.test.tsx`, `app/**/metadata.ts` builders, `middleware.ts` (*optional*), `sitemap.ts`, `robots.ts`

### `apps/backend/src/`
**Existing — modify:** `app.module.ts` (register new modules), `catalog/catalog.service.ts` + `controller.ts` (query/builders, categories, seed-guard, PATCH/DELETE), `orders/orders.service.ts` + `controller.ts` (cancel/transition/vendor-list routes, idempotency, price-conflict 409), `orders/dto/orders.dto.ts`, `admin/admin.service.ts` + `controller.ts` (real dashboard aggregates, products/customers/inventory/analytics/reconciliation/health), `fulfillment/*` (minimal — expose queue/reconcile state to admin), `common/audit/*` (indexes), `database/seed.ts` (users + categories + sample reviews/promotions), `database/migrations/*` (unify runner incl. `order_number`), `main.ts` (CORS allow-list + secure defaults).

**New — create:**
- `src/auth/` (module, controller, service, strategies, dto)
- `src/categories/` (module, controller, service) *(or fold into catalog — recommend fold into catalog to avoid sprawl)*
- `src/addresses/` (module, controller, service, entities)
- `src/cart/` *(optional P1)*
- `src/wishlist/` *(optional)*
- `src/reviews/`
- `src/notifications/`
- `src/promotions/` (incl. coupons)
- `src/recommendations/` (MVP SQL util + controller)
- `src/analytics/` (controller + service for buyer/vendor/admin aggregations)
- `src/common/entities/`: `user.entity.ts`, `category.entity.ts`, `address.entity.ts`, `review.entity.ts`, `notification.entity.ts`, `promotion.entity.ts`, `promotion-item.entity.ts`, `coupon.entity.ts`, `coupon-redemption.entity.ts`, `order-timeline-event.entity.ts`
- `src/common/guards/*`, `src/common/decorators/roles.decorator.ts`, `src/payments/*` (provider interface + mock)

**Migrations:** generated per phase; consolidated at Phase 14.

---

## 35. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Frontend↔backend contract drift (functions without routes) | High (already true) | Phase 0 contract audit + TypeScript mirror discipline (`lib/types.ts` "must stay 1:1") |
| Breaking the concurrency guarantee during checkout expansion | High | Never touch lock/transaction core; gate every change on `concurrency.spec.ts` + `order-lifecycle.e2e`; expand via additive steps (idempotency/coupon as separate services in the same tx) |
| Schema drift from `synchronize:true` | High | Stop relying on it for prod after Phase 0; generated migrations; migration runner unify |
| Production API URL broken again | High (known) | Vercel build env + Next rewrite; prod smoke test in CI; remove `.env.local` descent |
| Auth bootstrap creep | Medium | Minimal JWT + RBAC; no OAuth/2FA in P0; demo-user seed |
| Scope explosion (adding all marketplace features at once) | Medium | Priority matrix + 15-phase sequencing; P2/P3 strictly gated |
| Local vs server cart/wishlist merge complexity | Medium | Local-first in P0/P1; server merge as optional P1; document behavior |
| CORS/permissions issues with rewrite | Medium | Pin API proxy target + CORS allow-list to real origin; test in preview |
| Vendor/admin data leakage without real auth | High today | All vendor/admin data ops become server-authoritative post-P1; no client-supplied ids |
| No frontend tests to catch regressions | High | Add Vitest+RTL+Playwright from Phase 3 onward; CI test gate |

---

## 36. Acceptance Criteria (cross-cutting)

1. **No regression of correctness:** concurrency (no oversell) + order-lifecycle E2E suites remain green after every phase.
2. **Contract alignment:** every `lib/api.ts` function maps to a live, deployed backend route.
3. **Auth:** anonymous users can't reach vendor/admin surfaces or other users' data; roles enforced server-side.
4. **Production connectivity:** deployed frontend reaches the deployed API over HTTPS (proxy/rewrite), health smoke green.
5. **Four journeys green end-to-end (manual + Playwright):** browse→filter→cart→checkout→track; wishlist→move-to-cart→order; vendor: product→inventory→orders→DLQ-retry; admin: orders→resolve line item→audit trace.
6. **State design:** every screen has loading, success, empty, and error states — no blank screens.
7. **Design rules hold:** tokens only, `StatusBadge` for statuses, `hydrated` gating, URL-driven filters.
8. **DB migrations** are generated and applied, not left to `synchronize`, on settled schemas.
9. **A11y/SEO/perf** budgets pass (Phase 13) with no new violations.
10. **Deployment docs + `.env.example`** reflect the real production env; stray artifacts removed.

---

## 37. Definition of Done (per feature/phase)

A phase is done when:
- All listed frontend + backend files exist/modified; no dead routes; nav has zero 404s.
- `npx tsc --noEmit` passes in both apps; `npm run lint` clean in CI.
- New/changed endpoints have DTOs with class-validator rules; data-bearing responses have frontend TS mirrors.
- Required migrations generated + applied; relevant indexes present.
- Loading/empty/error states implemented on every new screen; a11y (keyboard + labels) checked.
- Unit tests for new logic and (from Phase 3) Playwright smoke for affected journeys are added and green in CI.
- The concurrency + lifecycle suites still pass (regression gate).
- Deployed to a preview/production environment with the smoke test passing before the phase is marked shipped.
- Docs updated: `MARKETPLACE_UI_CONTEXT.md` (route map + API table), `DEPLOYMENT.md`, and (for material decisions) `docs/`.
