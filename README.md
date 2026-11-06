# Marketplace Order Fulfillment

A production-grade, multi-vendor e-commerce platform with three distinct portals — **Consumer Storefront**, **Vendor Portal**, and **Admin Console** — built as a Turborepo monorepo.

**Live:**
- Storefront → https://marketplace-order-fulfillment-front.vercel.app
- Backend API → https://marketplace-backend-api-7cqo.onrender.com/api

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Portals](#portals)
   - [Consumer Storefront](#1-consumer-storefront)
   - [Vendor Portal](#2-vendor-portal)
   - [Admin Console](#3-admin-console)
3. [Complete Order Workflow](#complete-order-workflow)
4. [Backend Modules & API](#backend-modules--api)
5. [Data Model](#data-model)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Running Tests](#running-tests)
9. [Deployment](#deployment)
10. [Key Design Decisions](#key-design-decisions)

---

## Architecture Overview

```
marketplace-monorepo/
├── apps/
│   ├── backend/     NestJS REST API  (port 3001, global prefix /api)
│   └── frontend/    Next.js App Router (port 3000)
├── packages/
│   ├── config-eslint/
│   └── config-typescript/
└── turbo.json       Turborepo pipeline
```

| Layer | Tech |
|---|---|
| Backend framework | NestJS 10 + TypeORM 0.3 |
| Database | Supabase PostgreSQL (cloud) / PostgreSQL 16 (Docker) |
| Queue / async jobs | BullMQ + Redis 7 |
| Auth | JWT (access + refresh) + Google OAuth2 |
| Payments | Razorpay (UPI, cards, netbanking) + webhook verification |
| Frontend framework | Next.js App Router + TypeScript |
| UI state | Zustand (cart) + TanStack Query (server state) |
| Styling | Tailwind CSS v4 |
| Monorepo tooling | Turborepo 2 |
| Node requirement | >= 20 |

---

## Portals

### 1. Consumer Storefront

The public-facing shopping experience. Accessible to guests and authenticated buyers (`BUYER` role).

**Route → Purpose**

| Route | Purpose |
|---|---|
| `/` | Home — live category rail + featured products, trust badges, CTAs |
| `/products` | Full catalog — faceted search (category, vendor, price range), autocomplete |
| `/products/[id]` | Product detail — images, description, stock status, reviews, "Add to Cart" |
| `/vendors` | Vendor directory — all active sellers with profile cards |
| `/vendors/[vendorId]` | Individual vendor storefront — their products + info |
| `/cart` | Shopping cart — quantity controls, line totals, promotion discounts |
| `/checkout` | Place order — shipping address, payment via Razorpay or mock |
| `/orders` | My order history — status filter, order numbers |
| `/orders/[id]` | Order detail — line items, fulfillment status per item, tracking |
| `/returns` | Return / refund requests |
| `/wishlist` | Saved products |
| `/deals` | Active promotions and discounts |
| `/for-you` | Personalised product recommendations |
| `/loyalty` | Loyalty points balance and redemption |
| `/b2b` | B2B bulk ordering flow |
| `/notifications` | In-app notification centre |
| `/sell` | "Become a Vendor" landing page |
| `/sell/apply` | Vendor application form |
| `/about` | About page |
| `/help` | Help centre |
| `/contact-support` | Support contact form |

**Auth routes**

| Route | Purpose |
|---|---|
| `/login` | Email + password, or Google OAuth |
| `/register` | New buyer account |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password via token |

**Account**

| Route | Purpose |
|---|---|
| `/account` | Profile (display name, bio, email) |
| `/account/addresses` | Saved shipping addresses — add, edit, delete, set default |

---

### 2. Vendor Portal

Accessible to authenticated users with the `VENDOR` role. Every data operation is server-scoped to the vendor's own tenant — vendors cannot read or mutate another vendor's data.

**Route → Purpose**

| Route | Purpose |
|---|---|
| `/vendor/dashboard` | KPI overview — pending jobs, stock counts, open orders, dead-letter count, ambiguous jobs |
| `/vendor/products` | Product catalogue management — create, edit, soft-delete own products |
| `/vendor/inventory` | Stock adjustment — increment / decrement stock count per product |
| `/vendor/orders` | Incoming orders — view orders containing their line items, status transitions |
| `/vendor/promotions` | Create and manage discount campaigns — title, discount %, date window, funding type |
| `/vendor/payouts` | Payout ledger — view payment allocations, payout state, linked bank account |
| `/vendor/analytics` | Revenue and sales analytics for their store |
| `/vendor/settings` | Store profile settings |
| `/vendor/dead-letter` | Failed fulfillment sync jobs scoped to this vendor — inspect failure reason |
| `/vendor/applications` | Track the status of their own vendor application |

**Becoming a vendor**

A user submits an application from `/sell/apply`. Once approved by an admin, their account role is promoted to `VENDOR` and their `vendorId` is set. The admin can then link additional users to the same vendor account.

---

### 3. Admin Console

Accessible to `ADMIN` and `OPERATIONS` roles. Full platform visibility. Some destructive operations (vendor deletion, user unlinking) are gated to `ADMIN` only.

**Route → Purpose**

| Route | Purpose |
|---|---|
| `/admin` | Dashboard — orders KPIs, revenue metrics, analytics (7d / 14d / 30d windows) |
| `/admin/products` | Full product catalogue — view, edit, delete any product across all vendors |
| `/admin/vendors` | Vendor management — list all vendors, create new vendor accounts, link/unlink users to vendors |
| `/admin/vendor-applications` | Review pending applications — approve or reject with reason |
| `/admin/orders` | All orders platform-wide — cancel, resolve ambiguous line items |
| `/admin/orders/[id]` | Order detail + audit trail |
| `/admin/inventory` | Platform-wide inventory overview |
| `/admin/payments` | Payment ledger — allocations and transfer records across all vendors |
| `/admin/payments/disputes` | Razorpay dispute management — open / in-progress / resolved |
| `/admin/payments/refunds` | Refund records and states |
| `/admin/reconciliation` | Revenue reconciliation — split marketplace fee vs vendor proceeds |
| `/admin/categories` | Category management — create and manage product categories |
| `/admin/customers` | Customer accounts — search, view profile |
| `/admin/analytics` | Platform-wide analytics with time-window selector |
| `/admin/audit-logs` | Full audit trail — filterable by correlation ID or time range |
| `/admin/dead-letter` | All failed fulfillment jobs platform-wide — retry individual jobs |
| `/admin/health` | System health dashboard — API, database, Redis, queue stats |

---

## Complete Order Workflow

```
[Consumer] Browse → Add to Cart
       ↓
[Consumer] Checkout (shipping address + payment)
       ↓
[Backend]  POST /api/orders/checkout
       ├─ Idempotency check (buyer + key hash)
       ├─ Inventory lock  (sorted pessimistic write lock per product to prevent deadlocks)
       ├─ Stock decrement (fails checkout if any item is out of stock)
       ├─ Razorpay order initiation  →  payment capture / verification
       └─ Order record created  (status: PLACED)
               ↓
[Backend]  Per line item: BullMQ job enqueued to vendor-specific queue
               ↓
[Worker]   Vendor queue processor picks up job
       ├─ Calls vendor sync handler (worker registry pattern)
       ├─ Updates line item fulfillment_status: PENDING → SYNCING → CONFIRMED
       │
       ├─ Retry on failure (exponential backoff, max 5 attempts)
       │       ↓ on exhausted retries
       │   fulfillment_status = DEAD_LETTER
       │   → visible in /vendor/dead-letter and /admin/dead-letter
       │
       └─ Success: all line items CONFIRMED → Order status: FULFILLED
               ↓
[Backend]  Payment allocation: marketplace commission deducted, remainder allocated to vendor
[Backend]  Transfer instruction created → outbox dispatcher submits to Razorpay Transfers
[Vendor]   Views payout in /vendor/payouts
[Admin]    Reconciles in /admin/reconciliation
```

**Order statuses:** `PLACED → CONFIRMED → FULFILLING → FULFILLED | CANCELLED`

**Line item fulfillment statuses:** `PENDING → SYNCING → CONFIRMED | FAILED → DEAD_LETTER | AMBIGUOUS`

---

## Backend Modules & API

All routes are prefixed `/api`.

| Module | Route prefix | What it does |
|---|---|---|
| **auth** | `/auth` | Register, login, logout, refresh token, Google OAuth, change password, password reset |
| **catalog** | `/catalog` | Product listing with facets, vendor directory, category list, autocomplete, product CRUD, reviews |
| **orders** | `/orders` | Checkout, order history (buyer / vendor / admin), cancel, refund, status transition, audit log |
| **inventory** | `/inventory` | Stock query and adjustment per product |
| **fulfillment** | `/fulfillment` | Enqueue sync jobs, configure vendor concurrency, reconcile stale jobs, dead-letter queue, ambiguous queue, queue stats |
| **payments** (Razorpay) | `/payments/razorpay` | Initiate Razorpay order, verify payment signature, handle webhook events |
| **payments** (admin) | `/payments/admin` | Admin payment ledger (allocations + transfers) |
| **vendor-applications** | `/vendor-applications` | Submit application (public), view own applications, list all pending (admin), approve / reject |
| **vendor-promotions** | `/vendor/promotions` | CRUD promotions; admin approval/rejection via `/admin/promotions/:id/approve|reject` |
| **vendor-settings** | `/vendor/settings` | GET / PATCH vendor store settings |
| **vendor-payments** | `/vendor/payments` | View payment allocations for own vendor |
| **customer** | `/customer` | GET / PATCH customer profile |
| **customer-addresses** | `/customer/addresses` | CRUD shipping addresses |
| **admin** | `/admin` | Dashboard, KPI, analytics, orders, dead-letter retry, audit logs, correlation trace, vendor user management |
| **admin/customers** | `/admin/customers` | List all customer accounts |
| **transfers** | internal | Transfer instruction persistence, outbox dispatcher, Razorpay payout orchestration |
| **health** | `/health` | Liveness and readiness check |

**Role-based access control (RBAC)**

| Role | Access |
|---|---|
| `BUYER` | Storefront, own orders, own profile + addresses, reviews |
| `VENDOR` | Vendor portal (own tenant only), own products / inventory / orders / promotions / payouts |
| `ADMIN` | Full platform access, vendor management, approve/reject applications, reconciliation |
| `OPERATIONS` | Subset of admin — orders, analytics, dead-letter, audit logs; no destructive vendor ops |

---

## Data Model

Core entities and their relationships:

```
users
 ├─ role: BUYER | VENDOR | ADMIN | OPERATIONS
 └─ vendorId → vendors.id (set for VENDOR role)

vendors
 ├─ products[]
 ├─ promotions[]
 └─ orderLineItems[]

products
 ├─ vendorId → vendors.id
 ├─ category → categories.name (FK)
 ├─ images: text[]
 ├─ stockCount (pessimistic-locked on checkout)
 ├─ isActive (soft delete flag)
 └─ version (@VersionColumn — optimistic lock, 409 on conflict)

orders
 ├─ buyerId, buyerUserId
 ├─ status: PLACED | CONFIRMED | FULFILLING | FULFILLED | CANCELLED
 ├─ orderNumber (ORD-YYYYMMDD-NNNNNN)
 ├─ shippingAddress
 ├─ idempotencyKey + payloadHash (duplicate checkout protection)
 └─ lineItems[]

order_line_items
 ├─ orderId, productId, vendorId
 ├─ quantity, unitPrice, lineTotal
 ├─ effectiveUnitPrice, promotionId, promotionDiscountPercent
 └─ fulfillmentStatus: PENDING | SYNCING | CONFIRMED | FAILED | DEAD_LETTER | AMBIGUOUS

promotions
 ├─ vendorId, discountPercent, startDate, endDate
 ├─ fundingType: VENDOR_FUNDED | MARKETPLACE_FUNDED | CO_FUNDED
 └─ approvalState: PENDING | APPROVED | REJECTED

vendor_payment_allocation (VendorPaymentAllocation)
 └─ splits order revenue between marketplace and vendor

payment_transfers (PaymentTransfer)
 ├─ state: SCHEDULED | SUBMITTED | ACCEPTED | FAILED | REVERSED
 └─ destinationLinkedAccount (Razorpay linked account)

payment_disputes   — Razorpay disputes (OPEN / WON / LOST)
payment_refunds    — Refund records (REQUESTED / PROCESSED / FAILED)
reviews            — product ratings (1 per buyer per product)
oauth_identities   — Google OAuth identity linked to users
customer_addresses — saved shipping addresses per buyer
vendor_applications — application to become a vendor
```

---

## Getting Started

### Prerequisites

- Node.js >= 20 and npm 10
- PostgreSQL 16 (local or Supabase cloud)
- Redis 7 (optional — fulfillment queue degrades gracefully if Redis is not running)

### Local setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
# Optional: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, REDIS_HOST

# 3. Run database migrations
npm run migration:run

# 4. (Optional) Seed sample vendors and products
#    Guard: only runs if products table is empty
npm run seed

# 5. Start everything in development mode
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Health check: http://localhost:3001/api/health

### Run with Docker

```bash
# Starts api + postgres + redis (pgAdmin available with --profile development)
docker compose up

# With pgAdmin at http://localhost:5050
docker compose --profile development up
```

---

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start frontend + backend in watch mode |
| `npm run build` | Production build of all apps |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | TypeScript check across all apps |
| `npm run clean` | Remove all build artifacts and node_modules |
| `npm run seed` | Seed DB with sample vendors and products |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Revert the last migration |
| `npm run migration:production:status` | Check migration state against production DB |
| `npm run migration:production:up` | Run migrations against production DB |
| `npm run start:dev` | Backend only, watch mode |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes* | Full PostgreSQL connection string — takes precedence over individual `DB_*` vars when it contains a cloud host |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | Yes* | Used when `DATABASE_URL` is not set |
| `JWT_SECRET` | Yes | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Frontend → backend base URL (e.g. `http://localhost:3001/api`) |
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Backend port (default 3001) |
| `REDIS_HOST` / `REDIS_PORT` | No | BullMQ connection; fulfillment degrades without it |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Payment gateway; falls back to mock mode if absent |
| `CORS_ORIGINS` | No | Comma-separated allowed origins; supports Vercel wildcard patterns |
| `MIGRATION_TEST_DATABASE_URL` | No | Isolated database for migration integration tests only |

See `.env.example` for the full reference with comments.

---

## Running Tests

```bash
# All backend tests (Jest + ts-jest)
cd apps/backend && npm test

# Single test by name pattern
cd apps/backend && npm test -- --testNamePattern="catalog"

# All frontend tests
cd apps/frontend && npm test
```

Test suites in `apps/backend/src/` include:
- `catalog/test/` — catalog service, vendor assignment, regression specs
- `inventory/` — pessimistic lock and stock adjustment specs
- `auth/` — authentication and RBAC specs
- `database/migrations/test-integration/` — migration integration tests (require `MIGRATION_TEST_DATABASE_URL`)

---

## Deployment

| Service | Platform | Config file |
|---|---|---|
| Frontend | Vercel | `vercel.json` |
| Backend | Render (Dockerfile) | `railway.json` / `Dockerfile` |
| Database | Supabase PostgreSQL | Cloud-hosted, `sslmode=require` |
| Queue | Redis (managed) | `REDIS_HOST` / `REDIS_PORT` env vars |

Production migrations use the production runner:

```bash
npm run migration:production:up
```

---

## Key Design Decisions

**`synchronize: false` always** — TypeORM never auto-alters the schema. Every schema change is a versioned migration in `apps/backend/src/database/migrations/`.

**Vendor tenant isolation** — `assertVendorOwnsProduct()` in the catalog service ensures a `VENDOR` user can only read or mutate their own products. `ADMIN` bypasses this check. The `vendorId` on the authenticated user session is server-supplied, never accepted from the client.

**Soft deletes** — Products are deactivated (`isActive = false`) rather than hard-deleted, preserving historical order line item data and audit trails.

**Sorted pessimistic locks on checkout** — All inventory row locks during a checkout are acquired in a consistent ascending order by product ID. This prevents deadlocks when two concurrent checkouts overlap on the same set of products.

**Optimistic locking on products** — The `@VersionColumn()` on `Product` means that concurrent edits to product metadata return `409 Conflict` rather than silently overwriting each other.

**Idempotent checkout** — Orders carry an `idempotencyKey` + `idempotencyPayloadHash`. A duplicate submission with the same key returns the existing order without double-charging or double-decrementing stock.

**Vendor-specific BullMQ queues** — Each vendor gets its own queue (named `vendor-sync:<vendorId>`) with configurable concurrency. This isolates a slow or failing vendor's jobs from other vendors' fulfillment throughput.

**Dead-letter queue instead of silent failure** — When a fulfillment sync job exhausts all retries it lands in a dead-letter queue visible to both the vendor and admin, rather than failing silently. Vendors can inspect the failure reason; admins can trigger a retry.

**Promotion approval workflow** — Vendors create promotions with `approvalState: PENDING`. Admins approve or reject via `/admin/promotions/:id/approve|reject`. Only `APPROVED` promotions are applied at checkout. Funding type (`VENDOR_FUNDED`, `MARKETPLACE_FUNDED`, `CO_FUNDED`) determines how the discount cost is split in the payment allocation.

**Outbox pattern for payout transfers** — `PaymentTransfer` records are created in `SCHEDULED` state and dispatched to Razorpay by a separate `TransferOutboxDispatcherService`. This decouples order completion from the external payment transfer call and allows safe retry on network failure.
