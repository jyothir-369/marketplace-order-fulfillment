# marketplace-order-fulfillment — Implementation Fix Plan

Source: Codex repository audit, 2026-09-16, branch `jyothir`.
This document turns that audit into an ordered, actionable fix plan. Each item lists: the problem, the affected files, the concrete fix, and how to verify it.

Work top to bottom. Phases 0–3 are correctness/security fixes and should be done in order since later phases depend on earlier ones (e.g. the baseline migration in Phase 2 should exist before you start writing more migrations in later work). Phases 4–6 can be parallelized across contributors.

---

## Phase 0 — Stop the bleeding

### 0.1 Rotate the leaked Supabase credential

**Problem:** Root `.env` is tracked in git history with a live `DATABASE_URL` (Supabase host, real password) despite being in `.gitignore`. Gitignore does not remove already-tracked files or purge history.

**Fix:**
1. In Supabase dashboard → Database → reset the database password immediately. Update any deployed Railway env vars with the new `DATABASE_URL`.
2. Remove `.env` from git tracking going forward:
   ```bash
   git rm --cached .env
   git commit -m "chore: stop tracking .env"
   ```
3. Purge it from history (coordinate with anyone else who has clones — this rewrites history):
   ```bash
   pip install git-filter-repo   # or: brew install git-filter-repo
   git filter-repo --path .env --invert-paths
   git push --force --all
   git push --force --tags
   ```
4. Confirm `.env` is genuinely gitignored (it already is at line 11) and add `.env.local`, `.env.*.local` too if not present.
5. Verify: `git log --all --full-history -- .env` returns nothing after the rewrite.

**Do this before any other work** — every hour the old credential is live is an active exposure.

### 0.2 Remove the dev-secret JWT fallback

**Problem:** `auth.guard.ts:45` falls back to a hardcoded dev secret for **token verification** regardless of `NODE_ENV`. `auth.service.ts` already fails fast on missing `JWT_SECRET` when *signing* in production — but *verification* doesn't have the same guard, so a misconfigured prod deploy silently accepts tokens signed with the well-known dev secret.

**Fix (`apps/backend/src/auth/auth.guard.ts`):**
```ts
// Before (~line 45):
const secret = this.configService.get('JWT_SECRET') || DEV_FALLBACK_SECRET;

// After:
const secret = this.configService.get('JWT_SECRET');
if (!secret) {
  if (process.env.NODE_ENV === 'production') {
    throw new InternalServerErrorException('JWT_SECRET is not configured');
  }
  // dev-only fallback, loudly logged
  this.logger.warn('JWT_SECRET missing — using insecure dev fallback. Do not use in production.');
}
const effectiveSecret = secret ?? DEV_FALLBACK_SECRET;
```
Apply the same pattern anywhere else `DEV_FALLBACK_SECRET` (or equivalent) is referenced — grep for it:
```bash
grep -rn "DEV_FALLBACK_SECRET\|dev-secret\|devSecret" apps/backend/src
```

**Verify:** set `NODE_ENV=production` with `JWT_SECRET` unset locally and confirm the app throws on startup or on first guarded request, rather than accepting a token signed with the dev secret.

---

## Phase 1 — Make the core flows actually work end-to-end

### 1.1 Fix `GET /orders/me` (checkout never sets `buyerUserId`)

**Problem:** `orders.service.ts:175-184` (`getMyOrders`) filters on `buyerUserId`, but checkout (`orders.service.ts:35-147`) only ever sets `buyerId`, never `buyerUserId`. Every order has `buyer_user_id = NULL`, so `/orders/me` always returns `[]`. The checkout controller route also has no `AuthGuard`, so there's no authenticated user to read in the first place.

**Fix:**
1. In `orders.controller.ts`, on the checkout route, add an **optional** auth guard so both guest and authenticated checkout work:
   ```ts
   @Post('checkout')
   @UseGuards(OptionalAuthGuard)   // create this if it doesn't exist — see below
   async checkout(@Body() dto: CheckoutDto, @CurrentUser() user?: AuthenticatedUser) {
     return this.ordersService.checkout(dto, user?.id);
   }
   ```
2. If `OptionalAuthGuard` doesn't exist, create it as a thin wrapper around the existing `AuthGuard` that doesn't throw when no token is present (catches the failure and sets `request.user = undefined` instead of rejecting).
3. Update `orders.service.ts`'s `checkout()` signature to accept an optional `buyerUserId: string | undefined`, and pass it into the `Order` entity creation alongside `buyerId`:
   ```ts
   const order = this.orderRepo.create({
     ...,
     buyerId: dto.buyerId,
     buyerUserId: buyerUserId ?? null,
   });
   ```
4. Backfill won't help existing rows (no way to know who placed anonymous historical orders) — that's expected; only new orders will populate it.

**Verify:** log in, hit `POST /orders/checkout` with a valid Bearer token, then `GET /orders/me` and confirm the order appears. Also confirm checkout still works with no Authorization header (guest flow).

### 1.2 Wire the per-vendor BullMQ worker (or delete the dead path)

**Problem:** Two competing fulfillment paths exist:
- **Legacy (working):** `POST /fulfillment/sync/:id/legacy` → global `vendor-sync` queue → consumed by `VendorSyncProcessor`.
- **"Isolated" (broken):** `POST /fulfillment/sync/:id` → `VendorQueueService` creates per-vendor queues `vendor-sync-<vendorId>` → **nothing consumes them**. Meanwhile `VendorSyncIsolatedProcessor` listens on `vendor-sync-isolated`, a queue nothing enqueues to. Jobs submitted through the non-legacy route are silently dropped forever.

**Recommended fix — finish the isolated-queue design** (this is the architecturally interesting part of the project's value prop — per-vendor concurrency isolation — so it's worth completing rather than deleting):

1. In `apps/backend/src/fulfillment/`, create a queue-worker registry that creates a `Worker` for each vendor queue on demand, mirroring how `VendorQueueService.getOrCreateVendorQueue` creates the `Queue` on demand:
   ```ts
   // vendor-worker-registry.service.ts
   @Injectable()
   export class VendorWorkerRegistryService implements OnModuleDestroy {
     private workers = new Map<string, Worker>();

     constructor(
       private readonly fulfillmentService: FulfillmentService,
       private readonly configService: ConfigService,
     ) {}

     getOrCreateWorker(vendorId: string): Worker {
       const queueName = `vendor-sync-${vendorId}`;
       if (this.workers.has(queueName)) return this.workers.get(queueName)!;

       const worker = new Worker(
         queueName,
         async (job: Job) => this.fulfillmentService.processSyncJob(job.data),
         {
           connection: this.getRedisConnectionOptions(), // reuse the SAME config as app.module's BullMQ setup — see 1.3
           concurrency: 5,
         },
       );
       worker.on('failed', (job, err) =>
         this.fulfillmentService.handleSyncFailure(job?.data, err),
       );
       this.workers.set(queueName, worker);
       return worker;
     }

     async onModuleDestroy() {
       await Promise.all([...this.workers.values()].map((w) => w.close()));
     }
   }
   ```
2. Call `getOrCreateWorker(vendorId)` from `VendorQueueService.getOrCreateVendorQueue` (or `FulfillmentService`) at the same point a queue is first created, so a worker always exists before a job can be enqueued to that queue.
3. Delete `VendorSyncIsolatedProcessor` and the unused `vendor-sync-isolated` queue reference — it's dead code once the above lands.
4. Decide whether to keep both `/fulfillment/sync/:id` and `/fulfillment/sync/:id/legacy`, or consolidate to one route now that both are correct. If consolidating, update the frontend's `lib/api.ts` call sites accordingly.

**Alternative (faster, lower-value) fix:** delete the per-vendor queue path entirely, remove `VendorQueueService`'s queue-creation logic and the non-legacy route, and rename `/legacy` to the primary route. Only do this if per-vendor isolation isn't actually a requirement — check `DESIGN_ARCHITECTURE.md` before deciding, since it may document this as intentional.

**Verify:** add an integration test that enqueues a job via the non-legacy route and asserts the corresponding `order_line_items.fulfillment_status` transitions away from `pending` within a bounded time (poll or use BullMQ's `QueueEvents`).

### 1.3 Fix Redis connection config drift

**Problem:** `app.module.ts` configures BullMQ with `lazyConnect`, `maxRetriesPerRequest: null`, and a `retryStrategy`. `VendorQueueService` and the isolated processor instead build **raw** Redis connections straight from `process.env`, bypassing those safeguards. Under Redis unavailability, behavior will differ unpredictably between the two paths.

**Fix:**
1. Extract the BullMQ connection options from `app.module.ts` into a shared factory, e.g. `common/config/redis-connection.factory.ts`:
   ```ts
   export function getBullMQConnectionOptions(configService: ConfigService): ConnectionOptions {
     return {
       host: configService.get('REDIS_HOST'),
       port: configService.get('REDIS_PORT'),
       password: configService.get('REDIS_PASSWORD'),
       lazyConnect: true,
       maxRetriesPerRequest: null,
       retryStrategy: (times: number) => Math.min(times * 200, 5000),
     };
   }
   ```
2. Replace every direct `new Redis(...)` / `new IORedis(...)` construction in `vendor-queue.service.ts` and the worker registry from 1.2 with `getBullMQConnectionOptions(this.configService)`.
3. Remove the `process.stderr.write` monkey-patch in `main.ts:6-40` that suppresses Redis noise — once connections share the same retry/backoff config, you no longer need to hide errors; instead add a proper Redis `on('error', ...)` handler that logs through the app's normal logger at a throttled rate.

**Verify:** stop the Redis container mid-run (`docker compose stop redis`) and confirm both the legacy and per-vendor paths log a consistent, bounded set of reconnect attempts rather than crashing or going silent.

### 1.4 Fix `/catalog/autocomplete` route ordering

**Problem:** `catalog.controller.ts` declares `GET /catalog/:id` (line ~65) before `GET /catalog/autocomplete` (line ~112). NestJS/Express match routes in declaration order, so any request to `/catalog/autocomplete` is captured by `:id` with a `ParseUUIDPipe`, which rejects `"autocomplete"` as an invalid UUID → HTTP 400.

**Fix:** move the `autocomplete` route declaration above `:id` in the controller (or any other static/literal routes that currently sit below a `:id` param route):
```ts
@Get('autocomplete')
async autocomplete(@Query('q') q: string) { ... }

// ...then further down:
@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string) { ... }
```

**Verify:** `curl http://localhost:3001/api/catalog/autocomplete?q=shirt` returns suggestions, not a 400.

### 1.5 Implement or remove the 5 missing endpoints the frontend calls

**Problem:** Frontend calls these routes; none exist on the backend:
- `GET /orders/:orderId/audit` (used by `AuditLogModal.tsx`)
- `POST /catalog/categories` (admin categories page)
- `POST /catalog/vendors` (admin vendors page)
- `GET /catalog/vendors/admin` (admin vendors page)
- `GET /catalog/vendor/:vendorId/dashboard` (vendor dashboard page)

**Fix — implement each** (recommended, since the admin/vendor UI is otherwise complete and these are small):

1. **`GET /orders/:orderId/audit`** — in `orders.controller.ts`, add a route that queries `audit_logs` filtered by `entityType = 'ORDER'` and `entityId = orderId`, ordered by `createdAt`. Reuse the existing `AuditService` (already used elsewhere — check `common/audit/audit.service.ts` for a `findByEntity` method or add one).
   ```ts
   @Get(':id/audit')
   @UseGuards(AuthGuard, RolesGuard)
   @Roles(Role.ADMIN, Role.OPERATIONS)
   async getOrderAudit(@Param('id', ParseUUIDPipe) id: string) {
     return this.auditService.findByEntity('ORDER', id);
   }
   ```
2. **`POST /catalog/categories`** — add to `catalog.controller.ts`, `ADMIN`-only, validates a `CreateCategoryDto` (`name`, `slug`, `description`), inserts into `categories`.
3. **`POST /catalog/vendors`** — `ADMIN`-only, creates a `vendors` row (`name` at minimum; check if the frontend form sends more fields and match `CreateVendorDto` to it).
4. **`GET /catalog/vendors/admin`** — `ADMIN`-only, paginated list of all vendors with product counts (a join or a subquery `COUNT(products) GROUP BY vendor_id`).
5. **`GET /catalog/vendor/:vendorId/dashboard`** — `VENDOR` (own vendorId only — see Phase 3) or `ADMIN`. Returns aggregate stats: product count, total orders touching this vendor, revenue sum from `order_line_items.line_total` where `vendorId` matches, and pending fulfillment count. This overlaps with what the dead `dashboard/` module was probably meant to provide (see 4.1) — implement it fresh in `catalog` or `fulfillment` rather than reviving that module.

For each: check `frontend/lib/api.ts` and `frontend/lib/types.ts` for the exact expected request/response shape the frontend already assumes, and match it exactly rather than inventing a new contract.

**Verify:** exercise each admin/vendor page in the frontend against the local backend and confirm no more 404s in the network tab.

### 1.6 Make order cancellation transactional

**Problem:** `orders.service.ts:251-291` (`cancelOrder`) loops `restoreStock` calls **outside** a wrapping transaction, and the order status flip is a separate write. A crash mid-cancel can leave partial stock restored with the order still `active`.

**Fix:**
```ts
async cancelOrder(orderId: string) {
  return this.dataSource.transaction(async (manager) => {
    const order = await manager.findOne(Order, {
      where: { id: orderId },
      relations: ['lineItems'],
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.CANCELLED) return order; // idempotent

    for (const item of order.lineItems) {
      await this.inventoryService.restoreStock(item.productId, item.quantity, manager); // pass manager through
    }
    order.status = OrderStatus.CANCELLED;
    await manager.save(order);
    await this.auditService.log(manager, { /* ... */ });
    return order;
  });
}
```
Note: `inventoryService.restoreStock` currently opens its own `dataSource.transaction(...)` internally — refactor it to optionally accept an `EntityManager` so it can participate in an outer transaction instead of always starting a new one (same change needed for `decrementStock` if it's ever called from inside another transaction).

**Verify:** write a test that throws partway through a multi-item cancel (e.g. mock `restoreStock` to throw on the second item) and assert the whole transaction rolls back — order stays `fulfilling`/whatever it was, and no stock was restored.

---

## Phase 2 — Data model integrity

### 2.1 Write a baseline migration

**Problem:** Migrations 0001–0005 only `ALTER TABLE` on tables that no migration `CREATE`s. They only work today because dev/seed uses `synchronize: true`. `migration:run` against an empty database fails.

**Fix:**
1. Temporarily point `synchronize: true` at a **fresh** empty database and let TypeORM create the full schema.
2. Use the TypeORM CLI (or your custom migration runner's generate command, if it has one) to diff an empty schema against this one and emit `0000-Baseline.ts` containing all `CREATE TABLE` statements for the 9 entities as they exist today, including all indexes/constraints already present in the entities.
3. Manually reconcile: the baseline should represent the schema **before** 0001–0005 ran, so that replaying 0000→0005 in order against an empty DB produces the same end state as `synchronize: true` does today. Test this explicitly (see verify step).
4. Move to `synchronize: false` everywhere, including `seed.ts:42` — the seed script should run migrations first, then seed data, not rely on sync.

**Verify:**
```bash
docker compose down -v   # wipe volumes for a truly empty DB
docker compose up -d postgres
npm run migration:run --workspace=@marketplace/backend
npm run seed --workspace=@marketplace/backend
```
Confirm this succeeds with `synchronize: false` set everywhere, and that the resulting schema matches what `synchronize: true` currently produces (diff with `pg_dump --schema-only` against both).

### 2.2 Populate or drop `order_number`

**Problem:** `orders.order_number` is `varchar(20) unique` (migration 0003) but no entity field or code path ever writes it.

**Fix (recommended — populate it):**
1. Add `orderNumber: string` to `order.entity.ts` mapped to `order_number`.
2. Generate it at creation time inside the checkout transaction, e.g. `ORD-{YYYYMMDD}-{6-digit sequence}` — simplest robust approach: a Postgres sequence (`CREATE SEQUENCE order_number_seq`) referenced in a new migration, read via `nextval('order_number_seq')` inside the transaction, formatted in application code.
3. Surface it in the order response DTO and on the frontend order confirmation/history pages (nicer than showing a raw UUID to buyers).

**Alternative (drop it):** if there's no product need for a human-facing order number, write a migration to drop the column and remove the unique constraint — don't leave an unused unique column in place, since it does nothing but add write overhead risk.

### 2.3 Fix `product.description` / `product.images` phantom columns

**Problem:** `catalog.service.ts:482-483` reads `(product as any).description` / `.images` — columns that don't exist on the `products` table or entity. Currently silently `undefined` in API responses; a landmine if anything ever writes to these fields expecting persistence.

**Fix:**
1. Decide if these are actually needed. If catalog is meant to show product descriptions/images (likely yes, for a marketplace storefront):
   - Add `description: text nullable` and `images: text[] nullable` (or a separate `product_images` table if multiple images with ordering matter) to `product.entity.ts`.
   - Write a migration to add the columns.
   - Update `CreateProductDto`/`UpdateProductDto` to accept them, and `catalog.service.ts` to read/write real fields instead of `as any`.
2. If not needed, delete the dead reads in `toResponseDto`.

### 2.4 Add missing FKs and indexes

**Fix — new migration** adding:
```sql
ALTER TABLE products ADD CONSTRAINT fk_products_vendor
  FOREIGN KEY (vendor_id) REFERENCES vendors(id);
CREATE INDEX idx_products_vendor_id ON products(vendor_id);

ALTER TABLE orders ADD CONSTRAINT fk_orders_buyer_user
  FOREIGN KEY (buyer_user_id) REFERENCES users(id);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```
Also normalize `product.entity.ts`'s `vendorId` join column to snake_case (`vendor_id`) to match every other FK's naming convention — this requires a rename migration (`ALTER TABLE products RENAME COLUMN "vendorId" TO vendor_id;`) plus updating the `@JoinColumn({ name: ... })` decorator.

### 2.5 Handle `OptimisticLockVersionMismatchError` on product updates

**Problem:** `Product.version` (`@VersionColumn`) exists but `updateProduct` (`catalog.service.ts:86`) uses `save()`, which will throw `OptimisticLockVersionMismatchError` on concurrent edits — currently unhandled, surfaces as an unstyled 500.

**Fix:**
```ts
async updateProduct(id: string, dto: UpdateProductDto) {
  try {
    const product = await this.productRepo.findOneOrFail({ where: { id } });
    Object.assign(product, dto);
    return await this.productRepo.save(product);
  } catch (err) {
    if (err instanceof OptimisticLockVersionMismatchError) {
      throw new ConflictException('This product was modified by someone else. Please refresh and try again.');
    }
    throw err;
  }
}
```
If, after review, optimistic locking on products isn't actually a real requirement (inventory already uses pessimistic row locks for stock, which is the stronger guarantee), consider instead just removing `@VersionColumn` to simplify — but if you keep it, it must be handled, not left to 500.

---

## Phase 3 — Authorization / tenancy gaps

### 3.1 Vendor ownership checks on product writes

**Problem:** `catalog.service.ts` `updateProduct`/`deleteProduct` check role (`VENDOR`/`ADMIN`) but not ownership — any vendor can edit or delete any other vendor's products.

**Fix:**
```ts
async updateProduct(id: string, dto: UpdateProductDto, currentUser: AuthenticatedUser) {
  const product = await this.productRepo.findOneOrFail({ where: { id } });
  if (currentUser.role === Role.VENDOR && product.vendorId !== currentUser.vendorId) {
    throw new ForbiddenException('You do not own this product');
  }
  // ... existing update logic
}
```
Pass `@CurrentUser()` into the controller method and through to the service for both `updateProduct` and `deleteProduct`. Apply the identical pattern to any other vendor-scoped write once you find it (grep for `@Roles(Role.VENDOR` across the codebase).

### 3.2 Gate and scope vendor/buyer order reads

**Problem:** `GET /orders/vendor/:vendorId` and `GET /orders/buyer/:buyerId` are public and unauthenticated — anyone can pull any vendor's or buyer's order history by guessing/enumerating IDs.

**Fix:**
- `GET /orders/buyer/:buyerId`: require `AuthGuard`; if the caller isn't `ADMIN`/`OPERATIONS`, assert `req.user.id === buyerId` (or better — deprecate this route in favor of `/orders/me` now that 1.1 fixes it, and restrict this one to `ADMIN`/`OPERATIONS` only for support lookups).
- `GET /orders/vendor/:vendorId`: require `AuthGuard` + `RolesGuard(VENDOR, ADMIN, OPERATIONS)`; if caller is `VENDOR`, assert `req.user.vendorId === vendorId`.

### 3.3 Gate `dead-letter` / `ambiguous` fulfillment routes

**Problem:** `GET /fulfillment/dead-letter` and `GET /fulfillment/ambiguous` are public despite a code comment claiming vendor scoping.

**Fix:** add `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(Role.VENDOR, Role.ADMIN, Role.OPERATIONS)` at the controller-method level (matching the pattern already used correctly on `/fulfillment/vendor/:vendorId/configure`). If `VENDOR`, filter results to that vendor's line items only inside the service method.

---

## Phase 4 — Dead/vestigial code cleanup

### 4.1 Remove or repurpose the `dashboard/` module

**Problem:** `dashboard/dashboard.module.ts` defines an invoicing/tenant-style module (`tenantId`, `customer`, `invoice`, `outstanding_cents`) that's never imported into `app.module.ts` and whose service is an explicit stub. It doesn't match this domain at all — looks like leftover template code.

**Fix:** delete `apps/backend/src/dashboard/` entirely. If you need vendor/admin dashboard data, it's now covered by the real endpoint added in 1.5 step 5 (`GET /catalog/vendor/:vendorId/dashboard`) plus the existing `GET /admin/dashboard`.

```bash
git rm -r apps/backend/src/dashboard
```

### 4.2 Remove the dead `vendor-sync-isolated` processor

Already covered in 1.2 — once the per-vendor worker registry is live, delete `VendorSyncIsolatedProcessor` and any references to the `vendor-sync-isolated` queue name.

### 4.3 Resolve `infra/terraform/`

**Problem:** Terraform configs for AWS VPC exist but nothing in CI/CD uses them — the actual deploy targets are Railway (backend), Vercel (frontend), Supabase (DB).

**Fix:** either delete `infra/terraform/` (simplest — it's misleading dead config), or if there's a real future intent to move off Railway/Vercel to AWS, add a comment/README in that directory stating it's aspirational and not currently wired to CI, so contributors don't assume it's live infrastructure.

### 4.4 Fix `test/concurrency.spec.ts`

**Problem:** This spec describes a "secondary optimistic-lock guard" that doesn't exist in production code, and it lives outside `src/`, so it's outside the Jest `testMatch` glob and never runs in CI.

**Fix:**
1. Rewrite the spec to test what's actually implemented: concurrent `decrementStock` calls on the same product correctly serialize via the pessimistic row lock and never oversell (spin up N parallel `decrementStock` calls against a product with limited stock, assert total decremented never exceeds available stock and the correct number are rejected with insufficient-stock errors).
2. Move it to `apps/backend/src/inventory/inventory.concurrency.spec.ts` (or wherever matches `<rootDir>/src/**/*.spec.ts`) so it's picked up automatically.
3. Remove the `admin.service.spec.ts` exclusion in `jest.config.js`'s `testPathIgnorePatterns` — per the audit it tests an already-implemented feature and was excluded for an outdated reason. Run it, fix anything it surfaces, then let it run in CI.

---

## Phase 5 — Missing product-completeness features

These are lower priority than Phases 0–4 (which fix broken/insecure things); this phase is about closing the gap between the plan docs (`IMPLEMENTATION_PLAN.md`) and reality.

### 5.1 Payments (highest-value item in this phase)

**Problem:** Zero payment code in the backend. Checkout creates an order and commits inventory with no funds ever captured — the frontend's "Payment captured" timeline step and mock card UI are cosmetic only.

**Fix (minimum viable, still mock, but structurally real):**
1. Add a `PaymentsModule` with a `PaymentAuthorization` entity (`orderId`, `amount`, `status: [authorized, captured, failed, refunded]`, `provider: 'mock'`, `providerReference`, timestamps).
2. Insert an authorization step into the checkout transaction **before** committing inventory decrement: call a `MockPaymentService.authorize(amount)` (simulate success/decline, reusing the existing simulation pattern from `vendor-mock.service.ts`) and only proceed to decrement stock + create the order if authorization succeeds. On decline, roll back the transaction and return a clear error to the frontend (matching the existing "Decline" test-card option already in the UI).
3. Add a `POST /orders/:id/refund` (or fold into cancel) that reverses the mock authorization when an order is cancelled.
4. This makes "transactional checkout" claim true end-to-end — right now it's transactional for inventory but has no financial leg at all.

### 5.2 Reviews, coupons, notifications

**Problem:** Frontend has stub UI (`ReviewForm.tsx`, coupon validation stub in `lib/api.ts`, notifications page) with zero backend support, per `IMPLEMENTATION_PLAN.md` phases 12+.

**Fix — scope decision first:** decide whether these are in scope for "complete." If yes, each needs its own entity + module + endpoints (straightforward CRUD, lower risk than Phases 0-4). If no, strip the stub UI (delete the pages/components, or clearly mark them "coming soon" in the UI) so the app doesn't present broken-looking features to real users. I'd recommend deprioritizing full implementation of these below everything else here — they're additive, not correctness fixes.

---

## Phase 6 — Operational hardening

### 6.1 Rate limiting

**Fix:** add `@nestjs/throttler`:
```bash
npm install @nestjs/throttler --workspace=apps/backend
```
```ts
// app.module.ts
ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
```
Apply tighter limits specifically on `/auth/login`, `/auth/register`, and `/orders/checkout` via `@Throttle({ default: { limit: 10, ttl: 60000 } })` at the controller-method level, since these are the most abuse-sensitive public routes.

### 6.2 Structured logging

**Fix:** replace NestJS's default `Logger` with `nestjs-pino` (or `winston`) for JSON-structured output including `correlationId` on every line (you already have correlation IDs threaded through via `common/decorators/correlation-id.decorator.ts` — wire that same ID into the logger context so it's automatic rather than manually passed).

### 6.3 Remove the stderr-masking hook

Covered in 1.3 — once Redis connections are consistent and properly error-handled, delete the `process.stderr.write` monkey-patch in `main.ts:6-40`.

### 6.4 Fix the compose/Dockerfile port mismatch

**Problem:** `docker-compose.yml` maps `3000:3000` for the `api` service; `Dockerfile` sets `PORT=3001`/`EXPOSE 3001`.

**Fix:** pick one (3000 is the more common Nest default, but 3001 avoids clashing with the frontend's typical 3000) and align both files plus `main.ts`'s port-reading logic and the health check URL in `docker-compose.yml`.

### 6.5 CI/CD cleanup (`.github/workflows/ci-cd.yml`)

- Remove `|| true` from the frontend `lint-and-typecheck` job — frontend type errors should fail the build.
- Remove the duplicate job at lines ~197-204 that re-runs lint/typecheck/build already covered by earlier jobs.
- Add a coverage threshold to `test-backend` (start modest, e.g. 60% statements, and ratchet up over time) via `jest.config.js`'s `coverageThreshold`.
- Wire `*.e2e-spec.ts` into an actual CI job using `jest-e2e.config.js` (currently present but unused — anything matching that glob is invisible to CI today).
- Include `test/` and `*.spec.ts` files in the frontend/backend `tsconfig` typecheck scope rather than excluding them, so type errors in tests are caught too.

---

## Suggested execution order (single-track)

If working through this alone rather than in parallel:

1. Phase 0 (both items) — same day, non-negotiable
2. 1.1, 1.2, 1.3 — the three silently-broken core flows
3. 1.4, 1.5, 1.6 — remaining Phase 1 cleanup
4. Phase 2 (2.1 first — everything else in Phase 2 is easier once a real migration baseline exists)
5. Phase 3 — authz, can be done in parallel with Phase 2 by a second contributor
6. Phase 4 — cleanup, low risk, good "first PR" material for a new contributor
7. Phase 6 — operational hardening, can happen anytime after Phase 0
8. Phase 5 — feature completeness, do last, and only after confirming scope

## How to hand pieces of this back to Codex

For any single item above, a good Codex prompt is:

```
Implement fix [N.N] from IMPLEMENTATION_FIXES.md in the marketplace-order-fulfillment repo.
Read the current state of the affected files first, confirm the problem as described still
matches reality, then implement the fix exactly as specified — including the verification
step. Show me the diff before committing.
```

Doing them one at a time with a diff review keeps this auditable, given how much of the current state is undocumented drift between what the code claims to do and what it does.
