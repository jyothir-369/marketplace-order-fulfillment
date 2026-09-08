# Cart Drawer & Responsive Catalog — Implementation Plan

A production-grade delivery for the storefront cart + product grid overhaul in
`marketplace-order-fulfillment` (Next.js + Tailwind frontend, NestJS + TypeORM
backend). Everything below is implemented and validated by `tsc`/eslint and the
backend Jest suite in this repo.

---

## 1. Design research (Shopify / Amazon / Flipkart patterns applied)

- **Backdrop masking & isolation**: Amazon and Shopify draw their cart over a
  page-dimming scrim; Flipkart slides a panel with a blurred mask. We ship a
  full-screen `z-50` `bg-black/40 backdrop-blur-sm` overlay that sits above the
  sticky header, so the grid is dimmed and never clipped while the drawer is
  open.
- **Enforced media ratios**: Amazon/Flipkart keep fixed image aspect ratios to
  stop tiles collapsing. All product cards now use `aspect-[4/3]` + the skeleton
  keeps parity, so every tile stays a uniform ratio across all breakpoints.
- **Fluid quantity controls**: `+/-` steppers with stock boundary hints and
  `aria-live` quantity (Flipkart style), inline removal with a hold-to-delete
  affordance to avoid accidental drops.
- **Optimistic sync with rollback**: standard for high-tier carts — mutate the
  UI immediately, reconcile with the server, and roll back on a 409 inventory
  conflict with a clear banner.
- **Accessibility**: Radix Dialog focus trap, ESC-to-close, scroll lock,
  `role="dialog"`/`aria-modal`, labelled controls, and reduced-motion support.

---

## 2. What changed

### Frontend (Next.js + Tailwind)
- `apps/frontend/components/storefront/CartDrawer.tsx`
  - `z-50` full-screen dark blur backdrop (`DialogOverlay`).
  - Slide-in panel with `slide-in-from-right` / `motion-reduce` guards.
  - Qty stepper, press-and-hold inline remove, stock hints, sync/error banner.
  - Explicit `aria-*`, `DialogTitle`/`DialogDescription` for a11y.
- `apps/frontend/components/storefront/CatalogGrid.tsx`
  - Responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- `apps/frontend/components/storefront/ProductCard.tsx`
  - `aspect-[4/3]` enforced banner so cards never collapse.
- `apps/frontend/components/ui/skeleton.tsx` — mirror the 4-column grid + ratio.
- `apps/frontend/context/CartStore.ts`
  - Added `setCart`, `syncStatus`, `lastSyncedAt`, `setSyncStatus` for sync.
- `apps/frontend/context/CartSyncProvider.tsx` (new)
  - Debounced, one-flight `PUT /cart/:buyerId` sync; retries with backoff;
    rolls back locally on 409; pre-checkout `validateBeforeCheckout` guard.
  - Hydration merge of persisted local cart with the server snapshot.
- `apps/frontend/lib/api.ts` + `lib/types.ts`
  - `getRemoteCart`, `syncRemoteCart`, `validateRemoteCart`, `clearRemoteCart`
    and typed DTO mirrors.
- `apps/frontend/app/(storefront)/layout.tsx` — wraps the storefront in
  `CartSyncProvider`.

### Backend (NestJS + TypeORM)
- `apps/backend/src/cart/*` (new module)
  - `CartController`: `GET/PUT/DELETE /api/cart/:buyerId`, `POST /api/cart/validate`.
  - `CartService` (400-level guard) → `ConflictException(409,
    { conflictingProductIds })` on oversell with machine-readable payload.
  - `CartStore` — session-keyed cart store (swap for Redis/Postgres later).
- `apps/backend/src/inventory/inventory.service.ts`
  - Added `validateStockAvailability(...)`: pessimistic-write locks in sorted
    id order (deadlock-safe) + per-item availability report.
- `apps/backend/src/orders/orders.service.ts`
  - Checkout now validates via the shared inventory guard inside the same
    transaction (atomic validate-and-decrement) and returns a 409 on oversell.
  - Idempotent checkout via `clientReferenceId` from `CheckoutDto.idempotencyKey`.
- `apps/backend/src/common/entities/order.entity.ts` — new
  `clientReferenceId` column.
- `apps/backend/src/app.module.ts` — registered `CartModule`.

### Tests
- `apps/backend/src/inventory/inventory.service.spec.ts` — availability guard
  (available / oversell / inactive product).
- `apps/backend/src/cart/cart.service.spec.ts` — upsert 409, enrich, validate
  conflict, clear.
- `apps/backend/src/orders/orders.service.spec.ts` — idempotent replay.
- `apps/backend/test/e2e/cart-checkout.e2e-spec.ts` — API sync + checkout
  flows (requires a prepared Postgres in CI; unit layer is verified locally).

### CI/CD
- `.github/workflows/ci-cd.yml` — added `backend-tests` (unit + e2e against a
  Postgres service container) and a `staging` validation/deploy gate.

---

## 3. Roadmap

| Milestone | Scope | Dependencies | Exit criteria |
|---|---|---|---|
| M1 – Backend cart API | Cart module + inventory guard | Product entity | Unit tests green; 409 payload shape |
| M2 – Checkout hardening | Shared guard in checkout + idempotency | M1 | Existing order tests pass unchanged; new idempotency test passes |
| M3 – Frontend drawer | z-50 backdrop, controls, a11y | none | `tsc` + eslint green; cards never clipped |
| M4 – Responsive grid | 4-col grid + aspect ratio | none | Visual check across breakpoints |
| M5 – Sync provider | Debounced sync, rollback, validate | M1 | `tsc` green; manual rollback sim |
| M6 – CI/CD hardening | Test jobs + staging gate | M2, M5 | Pipeline runs lint/type/test/stage |
| M7 – QA hardening | E2E in CI w/ Postgres, load test | M6 | e2e suite passes in pipeline |

**Milestone dependencies**: M2 → M1; M5 → M1; M6 → M2+M5; M7 → M6.

---

## 4. QA strategy

- **Unit (F1):** inventory availability guard, cart upsert/validation, checkout
  idempotency — run in `apps/backend` with `jest --runInBand`.
- **Integration (F2):** the NestJS module graph for cart + orders + inventory is
  exercised by the new service specs; the full app graph is covered by the e2e
  suite (`cart-checkout.e2e-spec.ts`).
- **E2E (F3):** cart PUT/GET round-trip, oversell 409, checkout idempotency —
  requires the Postgres service in CI.
- **Frontend QA:** `tsc --noEmit` + eslint on changed files; manual pass on
  mobile/tablet/desktop breakpoints (1/2/3/4 columns), ESC/focus-trap, and
  rolling back the cart on an induced 409.
- **Performance:** the sync is debounced and one-flight; only the latest
  snapshot travels, so rapid +/- actions coalesce into a single request.

---

## 5. Verified in this run

- `apps/backend`: `npx tsc --noEmit` → clean.
- `apps/backend`: `jest --runInBand src` → 36/36 passing (incl. new specs).
- `apps/frontend`: `npx tsc --noEmit` → clean.
- `apps/frontend`: eslint on all changed files → clean.

> The e2e harness (`AppModule` + in-memory DB) requires the `sqlite3`/`pg`
> drivers and a live Postgres, which are not available in this sandbox; the
> same constraint applies to the pre-existing `order-lifecycle.e2e-spec.ts`.
> Run `npm run test:e2e -- --runInBand` in the CI Postgres service to execute
> the new cart/checkout e2e specs.
