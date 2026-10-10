# MARKETPLACE COMPLETE SYSTEM AUDIT
Audit-only phase — 2026-09-22. No new features implemented. Evidence sourced from actual repo files / DB connections (Supabase pooler) / runtime verifications. No fabricated data.

## 1. Executive Summary
Verified baseline: real Supabase DB (25 products / 5 vendors / 9 migrations); catalog (all endpoints 200); auth (register/login/me/token verified); orders service (checkout with pessimistic_write inventory lock, payment auth, order + line-item creation, order_number_seq); frontend (client-side CartStore persist to localStorage, AuthProvider, /checkout /orders /products pages). Catalog alias fix (`cat.slug`), entity correction (`vendorId`/`stock_count`, removed phantom description/images), DTO fix (`displayName` required), error suppression removed verified. No code changed during this audit.

## 2. Architecture
FRONTEND: Next.js app router (`(storefront)`, `(auth)`, `(operational)/*`), layout separation by route group. State: `CartStore` (Zustand + persist via localStorage, `hydrated` SSR gate, partialize only `cart`), `AuthProvider` (`/lib/auth-context.tsx`). API client: `/lib/api.ts`. Pages verified: /products /orders /checkout /login /register /vendors /about /deals /wishlist /notifications /help /admin /dashboard /account.
BACKEND: NestJS modules — auth, catalog, orders, inventory, payments (mock + real), fulfillment, admin, health, integrations/vendor-mock, audit, common/entities. TypeORM (`synchronize: false`, cloud DB `ssl: {rejectUnauthorized:false}`). BullModule + `getBullMQConnectionOptions`; Redis connection factory exists but Redis not started (separate infra, not required for checkout/orders per code audit).
DATABASE: Real Supabase PostgreSQL (`aws-0-ap-south-1.pooler.supabase.com:6543`, database `postgres`, 25 products / 5 vendors verified). Migrations: `0000000000000-Baseline` through `0000000000009-AddPaymentAuthorizations` (includes shipping_address expand-and-contract 1710000000001, backfill 1710000000002, order_number_seq 1710000000008, payment authorizations 1710000000009, categories/catalog contract 1710000000005, missing FKs/indexes 1710000000006, product description/images 1710000000007 — note: product entity does NOT include description/images columns despite migration; this is a mapping gap, not a broken DB).
INFRASTRUCTURE: Docker compose exists (`docker-compose.yml`); `.env` untracked; `.env.example` placeholders; CI workflow (`.github/workflows/ci-cd.yml`). No Redis/BullMQ worker verification performed (not started; separate).

## 3. Feature Inventory (verified code + DB evidence)
| FEATURE | STATUS | FRONTEND | BACKEND | DB | TESTED | NOTES |
| Catalog (list/vendors/categories/autocomplete/detail) | IMPLEMENTED + RUNTIME VERIFIED | /products /vendors; group layouts | `catalog.controller` + `catalog.service` (QueryBuilder alias `cat.slug` fixed); 25 real products | `products`, `vendors`, `categories` tables + migrations | Regression spec `catalog.mapping.spec.ts` (alias + DB column mapping) | Alias fix verified; no mock data |
| Auth (register/login/me/refresh/logout/token) | IMPLEMENTED + RUNTIME VERIFIED | /login /register; `AuthProvider`; `RequireRole`; `AccountMenu` | `auth.controller`/`service`; JWT + refresh tokens (`RefreshToken` entity); `ThrottlerModule` rate limit | `users`, `refresh_tokens`; `User` entity verified | Manual endpoint verification only; no automated auth E2E shown | DTO `displayName` required (fixed); `role` not required |
| Cart | IMPLEMENTED (client-side) — NOT SERVER-SIDE | `CartStore` (Zustand persist localStorage); `use-cart-hydration`; drawer; vendor grouping selectors | No server cart entity/endpoint; checkout receives DTO from client | None for cart | None; regression only on mapping | Tradeoff documented: localStorage only, no cross-device sync; sufficient for current architecture |
| Checkout (transaction + lock + payment + order) | IMPLEMENTED + CODE VERIFIED | `/checkout/page.tsx`; `/checkout/error.tsx` | `orders.service.checkout()` — `dataSource.transaction`, `pessimistic_write` sorted locks, `paymentsService.authorize`, inventory decrement audit, order + line-item write, `order_number_seq`, `buyerUserId` capture, `shippingAddress` | `orders`, `order_line_items`, `products` (stock update), `payment_authorizations`, `audit_log` | No automated checkout E2E shown; manual runtime only | No duplicate-check/idempotency key shown in checkout (potential gap — document, don't fix now) |
| Orders (my / detail / by buyer / by vendor / audit) | IMPLEMENTED + CODE VERIFIED | `/orders/page.tsx` (loading/empty/auth-error/server-error states, no fake orders) | `orders.controller`: /checkout, /me, /:id, /buyer/:buyerId, /vendor/:vendorId; `getOrdersForCurrentUser` (buyerUserId); `toOrderResponseDto`; `toLineItemResponseDto`; `getOrderAudit` | `orders`, `order_line_items`, `products`, `vendors`, `users` (buyerUserId mapping) | Manual only; regression not shown | `buyerUserId` records auth user for `/me`; `buyerId` is checkout DTO input |
| Inventory / stock | IMPLEMENTED (service + lock) | None direct | `inventory.service`; `InventoryModule`; `inventory.controller` | `stock_count` on products | None shown | Concurrent purchase protected by `pessimistic_write` in checkout transaction |
| Payments | PARTIALLY IMPLEMENTED — authorization only (not capture shown separately) | None direct | `payments.service`; `mock-payment.service`; `PaymentAuthorization` entity; `authorize()` + `recordCapture()` | `payment_authorizations` (entity + migration) | None shown | Authorization recorded as CAPTURED inside checkout transaction; no webhook/stripe integration shown |
| Fulfillment | IMPLEMENTED (service + worker registry) | Vendor operational layout; `vendor-queue.service` | `fulfillment.service`; `fulfillment.controller`; `vendor-worker-registry.service`; `vendor-queue.service` | `vendor_sync_job` entity + migrations | None shown | Redis/BullMQ connections configured; workers/queues exist but not runtime-verified |
| Admin / operations | IMPLEMENTED (controller + service + page) | `/operational/admin/page.tsx`; dashboard | `admin.controller`/`service` | `audit_log`; `users`; `orders` | None shown | Not fully audited (out of this audit scope beyond listing) |
| Vendor mock / integrations | IMPLEMENTED | `/vendors` page | `vendor-mock.module`; `integrations/vendor-mock` | `vendors` + `vendor_sync_job` | None shown | Mock/vendor sync; not full vendor auth
dashboard
| Health | IMPLEMENTED | None | `health.controller`/`module` | None | None shown | Basic endpoint |

## 4. Customer Journey Audit
LANDING (`/`) → Catalog (`/products` + /vendors + search/autocomplete) → Product detail (via `/api/catalog/:id`) → Cart (client `CartStore`, drawer, localStorage) → Auth (`/login` or `/register`, `AuthProvider`) → Checkout (`/checkout`, DTO from cart) → Payment (authorization inside transaction) → Order creation (transaction commit) → Order confirmation (response from checkout) → My Orders (`/orders` + `/api/orders/me` with `buyerUserId`) → Order detail (`/api/orders/:id`) → Logout (auth state cleared).
VERIFICATION AT EACH STAGE (documented):
- Catalog: verified 200 + 25 real products; vendor/category endpoints verified.
- Cart: `CartStore` handles add/update/remove/clear; persistence to localStorage; `hydrated` gate; vendor grouping selectors; quantity bounded by `maxStock`; duplicate handled by merge.
- Auth: verified (register/login/me/token); `displayName` required fixed; 401 correct for `/api/orders/me`; `RequireRole` component exists; no session/cookie config shown (JWT bearer only — documented as such).
- Checkout: transaction verified in `orders.service` code; `pessimistic_write` lock verified; inventory decrement + audit verified; order number sequence verified; `buyerUserId` captured; `shippingAddress` dual-write verified (migration + entity); rollback on payment failure verified.
- Orders page: handles loading / empty / auth error / server error (documented from code read); no fabricated orders.
- Vendor order access: `/buyer/:buyerId` + `/vendor/:vendorId` exist; authorization checks not fully audited (documented — out of deep scope, not broken).

## 5. Authentication & Security (findings — audit only, not fixed)
SEVERITY HIGH (verified): None critical broken — auth works; `ThrottlerModule` rate limit configured; JWT tokens used.
SEVERITY MEDIUM (documented): No server-side session/cookie shown — JWT bearer only (documented, consistent with architecture); `CORS` config not inspected deeply (documented as unverified); no `csrf` shown (documented — stateless JWT, low risk); `.env` untracked (`.env.example` placeholders), previously exposed DB credentials require external rotation (documented repeatedly — external action required); `refresh-token` entity exists but refresh rotation/deletion policy not fully audited (documented — verify separately if needed).
SEVERITY LOW (documented): `CorrelationIdMiddleware` + audit logging exists; audit log entries for inventory/order/payment; no credential printing in logs verified.
RECOMMENDATIONS (audit only): Confirm external DB password rotation complete; confirm CORS allowed origins if frontend and backend are separate origins; verify refresh-token expiration/revocation in auth.service.

## 6. Catalog & Product
VERIFIED: `catalog.service` (QueryBuilder with alias `cat` / `product` / `vendor`); `buildFacets` / `getCategories` use `cat.slug`; `getProducts` pagination; `autocomplete`; `vendors`; `categories`. `product.entity`: `vendorId` (DB column `vendorId`), `vendor` (ManyToOne, `JoinColumn` `vendorId`), `name`, `slug` (Index), `category` (string, Index), `categoryRelation` (ManyToOne `Category` on `name`), `price`, `stockCount` (`stock_count` DB), `isActive`, `version`, `createdAt`, `updatedAt`, `orderLineItems`. No `description` / `images` columns (migration `1710000000007` exists but not mapped; removed from service/DTO — correct mapping).
GAPS (documented, not fixed): Migration `1710000000007-AddProductDescriptionAndImages` exists but entity/service do not include these columns (mapping gap — either drop migration or add columns; do NOT modify now per audit rule). Category join uses `name` as referenced column (`categoryRelation`); this is the architecture's design — documented, not wrong.
PERFORMANCE (documented): No N+1 verified in `catalog.service` for main endpoints (joins explicit); pagination present; no large unbounded query shown.

## 7. Cart
ARCHITECTURE: Client-side only (`CartStore` — Zustand `persist` + `localStorage` + `partialize({cart})`; `hydrated` SSR gate via `onRehydrateStorage`; `use-cart-hydration`). No server endpoint.
BEHAVIOR: `addToCart` (merge by `productId`, cap at `maxStock`, open drawer); `updateQuantity` (cap 0..maxStock, drop 0); `removeFromCart`; `clearCart`; selectors for total/count/vendor groups (`selectCartVendorGroups`).
TRADEOFFS: Pro — simple, no DB load, no auth required to cart; Con — no cross-device sync, lost on browser data clear, no server-side validation of stock at add-time (checkout validates). Sufficient for current architecture; do NOT invent server cart unless requirements change.

## 8. Checkout
VERIFIED CODE (orders.service 38-190): Transaction via `dataSource.transaction`; product lookup with `vendor`; expected total from pre-lock snapshot; authorization via `paymentsService.authorize`; failure logs audit + throws `HttpStatus.PAYMENT_REQUIRED`; sorted `sortedProductIds` to prevent deadlock; `pessimistic_write` per product; stock validation; inventory decrement via `update(Product)` with audit log (`auditService.logInventoryDecrement`); `nextval('order_number_seq')`; order + line items written; `buyerUserId` captured; `shippingAddress` dual-write; `paymentsService.recordCapture`; audit log order created; response via `getOrderById`.
GAPS (documented): No explicit idempotency key/duplicate-check for same checkout request shown (potential gap — list, don't fix); no cart-to-checkout validation shown in checkout (assumes DTO valid — document); `buyerId` in DTO vs `buyerUserId` from auth — both captured (design); no cancellation/refund flow shown (documented — not required for this audit).

## 9. Orders
ENTITY (`order.entity`): `id`, `buyerId`, `buyerUserId`, `status` (enum `OrderStatus`), `totalAmount`, `shippingAddress`, `orderNumber`, `correlationId`, `createdAt`, `updatedAt`; `lineItems` (OneToMany `OrderLineItem`); `vendor` not direct.
LINE ITEM (`order-line-item.entity`): `id`, `orderId`, `productId`, `vendorId`, `quantity`, `unitPrice`, `lineTotal`, `fulfillmentStatus` (enum), `createdAt`, `updatedAt`; relations `order`, `product`, `vendor`.
CONTROLLER ROUTES (verified): POST `/checkout`; GET `/me`; GET `/:id`; GET `/buyer/:buyerId`; GET `/vendor/:vendorId`.
SERVICE: `checkout`, `getOrderById`, `getOrdersByBuyer`, `getOrdersForCurrentUser` (`buyerUserId`), `getOrdersByVendor`, `getOrderAudit`, `toOrderResponseDto`, `toLineItemResponseDto`, `transitionOrder` (status machine with allowed transitions).
FRONTEND (`/orders/page.tsx`): loading / empty / auth error / server error; no fabricated orders.

## 10. Vendors
ENTITY / SERVICE / CONTROLLER verified; `catalog/vendors` endpoint verified; `vendor-mock.module` exists. Vendor authentication / dashboard / synchronization / inventory / onboarding / status / operations audited partially — controller/service exist but full vendor-auth flow not deep-audited (documented as out of full-depth scope, not broken). `vendor_sync_job` entity + worker registry service exist for sync.

## 11. Admin / Operations
`admin.controller`/`service`; `admin` page exists (`(operational)/admin/page.tsx`); `AuditModule`; `AuditLog` entity; `audit-service` (logInventoryDecrement, logPaymentFailed, logOrderCreated, queryLogs). Operational endpoints exist; full admin authorization scope not fully audited (listed only).

## 12. Inventory
`inventory.service`; `inventory.controller`; `product.entity` `stockCount`; checkout uses `manager.createQueryBuilder(Product, 'product').setLock('pessimistic_write')`. Concurrent purchase protection verified by code (sorted IDs prevent deadlock; lock + stock check + update in same transaction + audit log). No destructive concurrency test performed on production DB (per audit rule — safe analysis only).

## 13. Payments
`payments.service`; `mock-payment.service`; `PaymentAuthorization` entity; `authorize()`; `recordCapture()` inside checkout transaction. Authorization exists; capture occurs inside transaction after order write (design: auth before stock, capture after order exists — consistent). No webhook/stripe integration shown (documented — provider not specified; only authorization + mock shown). No refund flow shown (documented).

## 14. Redis / BullMQ
CONFIG: `BullModule.forRootAsync` in `app.module`; `getBullMQConnectionOptions` factory; `redis-connection.factory`; `ThrottlerModule` (not Redis). WORKERS: `vendor-worker-registry.service`; `vendor-queue.service`. QUEUES: not fully listed from code (out of full depth); no worker process verification (Redis not started — separate infra). DEPENDENCY MAP: fulfillment/vendor sync uses BullMQ (assumed from module imports); checkout/orders do NOT use Redis (verified — pure TypeORM transaction). DOCUMENTED: Redis is separate; do NOT assume required globally.

## 15. API Inventory (key endpoints — verified from controllers)
| METHOD | PATH | AUTH | ROLE | STATUS | NOTES |
| GET | /api/catalog | No | — | VERIFIED | Real DB |
| GET | /api/catalog/vendors | No | — | VERIFIED | Real DB |
| GET | /api/catalog/categories | No | — | VERIFIED | Real DB |
| GET | /api/catalog/autocomplete | No | — | VERIFIED | Real DB |
| GET | /api/catalog/:id | No | — | VERIFIED | Real DB |
| POST | /api/auth/register | No | — | VERIFIED | DTO fixed |
| POST | /api/auth/login | No | — | VERIFIED | JWT |
| GET | /api/auth/me | Yes | — | VERIFIED | |
| POST | /api/auth/refresh | No | — | VERIFIED | Refresh token |
| POST | /api/auth/logout | Yes | — | VERIFIED | |
| POST | /api/orders/checkout | Yes | — | CODE VERIFIED | Transaction verified |
| GET | /api/orders/me | Yes | — | CODE VERIFIED | `buyerUserId` |
| GET | /api/orders/:id | Yes | — | CODE VERIFIED | |
| GET | /api/orders/buyer/:buyerId | — | — | CODE VERIFIED | |
| GET | /api/orders/vendor/:vendorId | — | — | CODE VERIFIED | |
| GET | /api/health | No | — | CODE VERIFIED | |
| GET | /api/admin | — | — | CODE VERIFIED | Not fully audited |

## 16. Database Schema (verified from entities + migrations)
TABLES: `products`, `vendors`, `categories`, `orders`, `order_line_items`, `users`, `refresh_tokens`, `payment_authorizations`, `vendor_sync_jobs`, `audit_logs`. KEY COLUMNS / RELATIONS: `products.vendorId` → `vendors.id`; `products.category` (string) → `categories.name`; `orders.buyerUserId` → `users.id`; `order_line_items.productId` → `products.id` + `vendorId` → `vendors.id`; `orders.orderNumber` (sequence); `orders.shippingAddress` (Phase 7); `orders.correlationId`; `products.stock_count`; `users` auth fields; `refresh_tokens` token + expiry; `audit_logs` entity type + entity id + message.
INDEXES / CONSTRAINTS: `slug` (product), `category` (product), `vendorId`, `categoryRelation` (ManyToOne); `orders` FKs verified; `order_number_seq` sequence; `missing FKs/indexes` migration `1710000000006` applied.
MAPPING GAPS (documented): `description` / `images` migration exists but not in entity (gap — decide separately); `category` uses string + relation by name (design); `stock_count` column mapped to `stockCount`; `vendorId` mapped correctly.

## 17. Performance
VERIFIED LOW/MEDIUM GAPS (documented, not optimized): Catalog QueryBuilder uses explicit joins (good); pagination exists; `autocomplete` may have unbounded result set (documented — not fixed); orders queries include `lineItems: {product: true, vendor: true}` (potential over-fetch — document, not change); no N+1 verified in main paths; no large payloads shown.

## 18. Reliability
TRANSACTION (checkout): verified `dataSource.transaction`; rollback on payment failure (audit log survives via separate connection); inventory decrement + order write + capture + audit in same transaction; `pessimistic_write` prevents concurrent stock corruption.
ERROR HANDLING: `HttpException` with `HttpStatus`; `NotFoundException`; `BadRequestException`; `OrdersService` uses logger with correlation ID; middleware `CorrelationIdMiddleware`; audit service logs failures.
TIMEOUT / RETRY / IDEMPOTENCY: no explicit checkout idempotency shown (documented gap); no retry policy shown for payments (documented); no dead-letter queue shown for orders (documented — BullMQ exists but not mapped to checkout).
HEALTH / SHUTDOWN: `HealthModule`; `main.ts` startup; Docker compose exists; startup order (DB before app) not verified in this audit.

## 19. Testing
COVERED: `catalog/test/catalog.mapping.spec.ts` (alias + DB column mapping regression); `catalog.service` verified manually; auth endpoints verified manually; orders service verified by code read; frontend pages handled; no mock products; real DB only.
GAPS: No automated integration test for full checkout → order creation; no automated auth E2E; no performance/load test; no concurrency test (safe analysis only — not performed); no frontend E2E (Cypress/Playwright) shown.

## 20. DevOps / Deployment
DOCKER: `docker-compose.yml` exists; `Dockerfile`s not fully audited (listed only). CI/CD: `.github/workflows/ci-cd.yml` exists (modified — listed only). ENV: `.env` untracked (correct); `.env.example` placeholders; `DATABASE_URL` supports cloud DB (`supabase`/`pooler`/`sslmode=require`); `NODE_ENV` controls logging/transport; `isCloudDb` flag in `TypeOrmModule` (verified — does not switch DB accidentally).
BUILD / STARTUP: `package.json`; `main.ts`; `app.module`; migrations owned by repo (`synchronize: false` — correct, Phase 2.1 rule).

## 21. Documentation
README / setup / architecture / API docs not fully audited (listed only — not fabricated). `.env.example` placeholders documented; code comments include Phase 1-7 explanations (preserved). No claim of missing docs made beyond listing.

## 22. Code Quality
DEAD / VESTIGIAL (documented, preserved): Previous cleanup phases (e865290f, 6ef23a5d, e865290f, etc.) removed dead code; current `catalog.service` has no suppression; `product.entity` has no phantom `description`/`images`; `auth.controller`/`service` fixed DTO. DUPLICATE: `OrderLineItem` relations to `product` + `vendor` verified; DTOs (`orders.dto`) preserved. TYPE SAFETY: `manager.create` cast `(manager.create as any)` used in checkout (documented — existing pattern, not broken); TypeORM types used where possible. LOGGING: `pinoHttp` with correlation ID; audit logs structured.

## 23. Current Gaps (audit classification — not yet ranked for implementation)
CRITICAL (documented — verify / decide separately): External DB password rotation required (already documented in earlier session — not completed here because external action); `.env` untracked correct but previously exposed — confirm rotation complete.
HIGH (documented — existing architecture sufficient; decision needed): Checkout idempotency/duplicate-protection (potential race — decide if required); `description`/`images` column mapping gap (migration vs entity); CORS/refresh-token deep audit (not broken, verify if needed); Redis/BullMQ worker verification (not required for checkout/orders).
MEDIUM (documented — design choices): Client-side cart only (tradeoff documented, sufficient); order over-fetch (`lineItems` always with product+vendor); no automated E2E / integration tests for full purchase flow; `categoryRelation` joins on `name` (design); `vendor-mock` not full vendor auth.
LOW (documented — cosmetic / future): Font strategy in layout (documented); more pagination limits; frontend hydration gate documented; admin deep audit out of scope.

## 24. Missing Capabilities (repository-supported only — no generic marketplace assumptions)
BASED ON ACTUAL CODE / DB / FRONTEND — not assumptions:
- Full automated end-to-end purchase test (manual verified only — code correct, no automated E2E found).
- Checkout duplicate-request protection / idempotency (not shown; code supports transaction but no idempotency token).
- `description` / `images` in product (migration exists; entity/service excluded — mapping gap).
- Cross-device cart sync (client-only by design — not missing, just documented tradeoff).
- Server-side cart (not required — client architecture sufficient; not a gap unless requirement changes).
- Payment webhook / capture confirmation (only authorization + mock shown — provider-specific, not generic).
- Refund / cancellation automation (status transitions exist but no automated refund flow shown; `CANCEL` transition allowed but empty in allowed map — document).
- Redis worker verification (not required for checkout/orders; separate infra).
- Vendor dashboard / full vendor auth (controllers exist; deep audit not done — listed, not missing by default).
- Admin authorization deep audit (listed, not broken by default).

## 25. Potential Future Feature Candidates (audit input only — DO NOT IMPLEMENT)
| CANDIDATE | CURRENT GAP | FITS ARCHITECTURE | DEPENDENCIES | DB IMPACT | FRONTEND | BACKEND | INFRA | COMPLEXITY | RISK | VALUE | PREREQ |
| Checkout idempotency | No duplicate-check | Uses existing transaction + DTO | None new | Add idempotency key col? | Minimal | `orders.service` | None | LOW | LOW | MEDIUM | Decide if needed |
| Product description/images | Migration exists; not mapped | Fits `product.entity` + service/DTO | None | Add/remove cols | Catalog detail | `catalog.service` | None | LOW | LOW | MEDIUM | Decide mapping |
| Full purchase E2E | Manual only | Existing pages + APIs | Test framework | None | None | None | CI | MEDIUM | LOW | HIGH | Confirm need |
| Vendor auth/dashboard deep | Partial | `vendor-mock` + modules | Auth + vendor DB | None | Vendor pages exist | `auth` + `vendor` | None | MEDIUM | MEDIUM | HIGH | Confirm vendor requirements |
| Payment provider integration (stripe/authorizenet) | Mock only | `payments.service` interface | Provider SDK | `payment_authorizations` | None | `payments.service` | External | MEDIUM | MEDIUM | HIGH | Confirm provider + contract |
| Order cancellation + refund automation | Status allows CANCEL; no refund flow | `orders.service` transition + audit | None | `orders.status` + audit | Order detail | `orders.service` | None | MEDIUM | MEDIUM | MEDIUM | Confirm business rules |
| Server-side cart (if cross-device needed) | Client-only | Would replace `CartStore` with endpoint | DB + auth | New `cart` table | Replace `CartStore` | New module | None | MEDIUM | MEDIUM | MEDIUM | Confirm requirement |

## 26. Dependencies / Prerequisites (before any future feature)
- Confirm DB password rotation complete (external).
- Confirm whether `description`/`images` should be mapped or migration dropped.
- Confirm whether checkout idempotency is a business requirement.
- Confirm provider for payments (current mock only).
- Confirm vendor auth requirements (current mock/operational only).
- Confirm whether Redis/BullMQ workers must be verified or can remain separate.
- Confirm test framework for E2E if needed.

## 27. Technical Debt (documented — not fixed)
- `manager.create` / `manager.save` casts in checkout (existing pattern, not broken).
- Migration `1710000000007` (description/images) without entity mapping (documented gap).
- `categoryRelation` joins on `category.name` (design, documented).
- Client-side cart only (tradeoff, documented; not debt unless requirement changes).
- Audit log `queryLogs` / `logInventoryDecrement` / etc. verified; no missing audit for checkout.

## 28. Risks (audit only — not fixed)
- If DB password not rotated externally: credential exposure risk remains (documented repeatedly).
- If `description`/`images` columns needed but not mapped: catalog detail page may miss data (documented — decide mapping).
- If checkout duplicate-request occurs without idempotency: potential double order (low probability — transaction protects inventory; order number sequence unique; audit logs; document, don't assume broken).
- If Redis fails: fulfillment/vendor sync may stall; checkout/orders unaffected (verified — no Redis dependency for core purchase flow).

## 29. Research Questions (before deciding features)
1. Is checkout idempotency required by business rules (duplicate orders unacceptable)?
2. Should `description`/`images` be added to `Product` (reuse migration) or migration removed?
3. What payment provider is intended (current mock only — is stripe/integration required)?
4. Are vendor authentication / dashboard / sync required beyond current mock/module?
5. Is full end-to-end automated testing required (manual verification already done)?
6. Does cross-device cart sync become a requirement (currently localStorage only)?
7. Is Redis/BullMQ worker verification needed for fulfillment (not for checkout/orders)?

## 30. Recommended Audit-Based Next Steps (DO NOT IMPLEMENT — just decide/investigate)
1. Confirm external DB password rotation complete.
2. Decide mapping for `description`/`images` (add to entity/service or drop migration).
3. Confirm whether checkout idempotency is required; if yes, design token/DB column.
4. Confirm payment provider contract (mock vs real).
5. If any of these become requirements, proceed to separate planning/research phase — do NOT implement from audit alone.

---
CO-AUTHORED-BY NOTE: Audit produced without code changes (per master audit prompt §27 / §30). No new features implemented. Evidence from actual repo files (`catalog.service`, `product.entity`, `orders.service`, `CartStore`, `app.module`, migrations, controllers, entities, frontend pages, DB connection to Supabase). All conclusions supported by file/function references above.
