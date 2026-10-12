# Implementation Plan: "Sell" Section — Vendor Portal & Manage Products

**Repo:** `jyothir-369/marketplace-order-fulfillment` (analysed at commit `26a6933`)
**Targets:** `/vendor/dashboard` (Vendor Portal) and `/vendor/products` (Manage products)
**Status:** Draft for review. Nothing here has been implemented yet.

---

## 1. Executive summary

**The premise needs a correction first: these two pages are not unimplemented.** Both already exist with real frontend code and real, role-protected backend endpoints. What is actually broken is the *path to reach them*:

1. **No normal user can ever become a vendor.** Public registration hard-codes `role: BUYER, vendorId: null`. The only vendor login is a seeded demo account. The Admin "Onboard Vendor" screen creates a vendor *record* but never links any *user* to it.
2. **The failure is silent.** The footer shows "Vendor Portal" and "Manage products" to everyone. A logged-in buyer (e.g. "Sai Vandana" in your screenshot) who clicks them is bounced back to `/products` by `RequireRole` with no message. That looks exactly like "not implemented".
3. **Beyond access, there are real defects** in the existing pages (details in §6): the dashboard's *Pending* and *Dead-letter* counters are always `0` due to a query bug, the category field can trigger a database FK error, and `description`/`images` are silently dropped on product creation.

**Fit verdict:** Manage Products and the Vendor Portal dashboard are a **good fit** for the project's data model, requirements and own roadmap, *provided we use admin-mediated vendor linking* and **do not** build self-service onboarding, KYC or payouts (those conflict with the PRD's non-goals). Recommended effort: **roughly 6–9 working days** for one developer (an estimate, not a measurement).

**One decision needed from you** (§5): confirm admin-mediated vendor linking (recommended) over self-service onboarding.

---

## 2. How this was researched

| Source | What I did |
|---|---|
| Repository | Cloned and read the actual code (frontend vendor routes, `catalog`/`auth`/`admin`/`inventory`/`orders` backend modules, entities, migrations, seed script) |
| Project docs | Read `prd.md`, `problem statement.md`, `MARKETPLACE_MASTER_IMPLEMENTATION_BLUEPRINT.md`, `MARKETPLACE_NAVIGATION_PHASES.md`, `IMPLEMENTATION_PLAN.md` |
| Library behaviour | Verified two TypeORM behaviours against the library's own source (`select()` replacement semantics; `update()` version bump) rather than relying on memory |

**Limits of this research (please read):** I did **not** run the application, the database, or the test suite. Findings come from static reading of the code and docs. Anything marked *"verify"* below should be confirmed by running it. The `IMPLEMENTATION_PLAN.md` file in the repo is **stale** on this topic: it says the vendor endpoints do not exist, but the controller now implements them. I trusted the code over that document.

---

## 3. Current-state audit

### 3.1 What exists today

| Layer | Vendor Portal (`/vendor/dashboard`) | Manage products (`/vendor/products`) |
|---|---|---|
| Frontend page | Implemented (246 lines): 8 KPI tiles, stock-health / sync-health / open-orders panels, snapshot table, loading/error/retry states | Implemented (524 lines): product table, create/edit form, deactivate/reactivate, `409` conflict handling, empty & error states |
| API client (`lib/api.ts`) | `getVendorDashboard` | `getVendorProducts`, `createProduct`, `updateProduct`, `deleteProduct` |
| Backend route | `GET /api/catalog/vendor/:vendorId/dashboard` | `GET …/vendor/:vendorId/manage`, `POST /api/catalog`, `PATCH /api/catalog/:id`, `DELETE /api/catalog/:id` |
| AuthZ | `@Roles(VENDOR, ADMIN, OPERATIONS)` + `assertVendorScoped` | `@Roles(VENDOR, ADMIN)` + `assertVendorScoped` / `assertVendorOwnsProduct`; vendors forced onto their own tenant on create |
| Concurrency | n/a | `@VersionColumn` optimistic lock → `409 Conflict` |
| Tests | — | Cross-tenant update and deactivate denial covered in `catalog.service.spec.ts` |
| **Access path for a real user** | **Missing** | **Missing** |

The sidebar (`OperationalSidebar`) also lists Inventory, Orders, Analytics, Promotions, Settings and Dead-Letter. Of those, Inventory, Orders and Dead-Letter are real pages; **Promotions** is a `ComingSoon` stub and **Settings** is a hardcoded mock.

### 3.2 Why you see "not implemented" (root cause)

```
Footer link (shown to everyone)  →  /vendor/dashboard
        ↓
vendor/layout.tsx wraps everything in <RequireRole roles={["vendor"]}>
        ↓
user.role === "buyer"  →  router.replace("/products")   ← silent, no message
```

`useVendorId()` additionally returns `null` for any account whose `vendorId` is null, and the products page then shows "This account is not linked to a vendor." — but a buyer never even reaches that screen.

**Quick confirmation (2 minutes, no code):** log in as the seeded demo vendor `vendor@marketplace.dev` (password `DemoPass2024!`, defined in `apps/backend/src/database/seed.ts`). Both pages should load. If they do, the pages work and only access/provisioning is missing.

> ⚠️ **Do not run `seed.ts` on a database you care about.** It executes `TRUNCATE … RESTART IDENTITY CASCADE` on users, products, orders and more. If the demo vendor doesn't exist in your DB, use the SQL shortcut in §8 instead.

---

## 4. Scope-fit analysis

| Requirement source | What it says | Implication for this work |
|---|---|---|
| **PRD §4 Non-goals** | "Vendor onboarding UI (vendors and their inventory can be seeded via fixtures/admin script)" | **Self-service onboarding is out of scope.** Admin-mediated linking stays inside the spirit of this line. |
| **PRD §5 Personas** | Vendor is "simulated"; inventory/fulfillment arrive via a mock external API | The PRD has no vendor UI at all, so the portal is an *extension* beyond the PRD (the repo has already grown well past it: auth/RBAC, Razorpay, reviews, addresses). It should be framed as such, not as a PRD requirement. |
| **PRD FR1** | Products belong to a vendor and have a stock count | Manage Products is the natural UI for this. **Direct fit.** |
| **PRD FR2/FR3 + NFR Auditability** | Stock changes must be transactional; every inventory change logged with a correlation ID | Vendor stock edits must not bypass this (see defect D7). This is what makes the feature *consistent with the project's thesis*. |
| **PRD FR8–FR10** | Dead-letter / ambiguous states visible to admins | Vendor dashboard surfacing the same counts is consistent (but currently buggy, D3). |
| **Master Blueprint, Phase 2** | F7 "vendor auth" and F8 "vendor product/inventory CRUD", gated on decision **B5 – Vendor onboarding model** (options: (a) admin-mediated, (b) self-service, (c) self-service + KYC) | This plan is the minimal slice of F7/F8 under **B5(a)**. |
| **Navigation Phases doc** | Footer "Sell" column should offer *Become a vendor, Vendor dashboard, Vendor support* | Supports adding a role-aware "Become a vendor" destination. |

**Verdict**

| Item | Fit |
|---|---|
| Manage Products (CRUD, activate/deactivate) | Good fit |
| Vendor dashboard (operational summary) | Good fit |
| Admin-mediated user→vendor linking | Good fit (minimal, needed) |
| Self-service onboarding / KYC | **Not a fit** (PRD non-goal; Blueprint defers) |
| Payouts, commission, promotions CRUD | **Not a fit** for this plan (separate Blueprint phases) |

---

## 5. Decision required: vendor onboarding model (Blueprint B5)

| Option | Description | Effort | Fit with PRD | Risk |
|---|---|---|---|---|
| **(a) Admin-mediated** *(recommended)* | Admin links an existing user account to a vendor record via the admin console | Low | Matches "seeded / admin script" non-goal | Low |
| (b) Self-service | Users apply and are auto-approved/queued | High (application model, review queue, abuse handling) | Conflicts with non-goal | Medium: vendor isolation, spam |
| (c) Self-service + KYC | (b) plus external identity verification | Very high | Conflicts | High: sensitive data, compliance |

**Recommendation: (a).** Everything below assumes (a). If you choose (b) or (c), Phase 1 needs to be re-planned.

---

## 6. Defect & gap register

Severity reflects impact on the two target pages. Evidence references are file/function names; line numbers were not used because they drift.

| ID | Sev. | Finding | Evidence | Fix (phase) |
|---|---|---|---|---|
| **D1** | High | No way for a registered user to become a vendor | `auth.service.ts` `register()` forces `BUYER`/`vendorId: null`; `catalog.service.ts` `createVendor()` creates only a vendor row; no admin endpoint touches `users.role`/`vendor_id` | P1 |
| **D2** | Med | Silent bounce for wrong role; "Sell" links shown to everyone | `StorefrontFooter.tsx` static links; `use-role-guard.ts` redirects with no notice | P1 |
| **D3** | Med | Dashboard **Pending** and **Dead-letter** counters always `0` | `catalog.service.ts` `getVendorFulfillmentCounts()` calls `.select()` three times. TypeORM's `select()` *replaces* prior selections (verified in `SelectQueryBuilder.js`: `this.expressionMap.selects = [...]`), so only `amb` survives; `row.pending`/`row.dead` are `undefined` → `0` | P2 |
| **D4** | Med | Free-text category can fail with a DB error | UI uses a plain text input; DB has `fk_products_category` → `categories(name)` (migration `…005`). A category not in `categories` violates the FK. *(Verify exact HTTP status; likely 500.)* | P3 |
| **D5** | Med | `description` / `images` ignored on create; UI has no fields for them | `createProduct()` builds the entity without them (update does handle them); frontend `CreateProductDto` type and form omit them | P3 |
| **D6** | Low–Med | Server-side validation weaker than UI | `CreateProductDto`: `stockCount` uses `@IsNumber` (accepts `1.5`); `name` uses `@IsString` (accepts `""`); price scale not limited to 2 dp | P3 |
| **D7** | Med | Vendor stock edits bypass the audited, locked inventory path; edit form always submits stale `stockCount` | Stock set via generic `PATCH /catalog/:id` (no audit entry); checkout/inventory decrements are row-locked and audited. The optimistic lock *does* protect correctness (verified: QueryBuilder `update()` bumps the version column), but a vendor editing only a price will hit avoidable `409`s whenever a sale lands in between | P3 |
| **D8** | Low | Analytics page not tenant-aware; Settings is a fake | `analytics/page.tsx` calls `getVendorDashboard()` with no id → falls back to hardcoded `VENDOR_ID` constant → `403` for real vendors; `settings/page.tsx` shows hardcoded "Electronics World" with a non-functional Save button | P2 |
| **D9** | Info | Role/vendor changes take effect only after token refresh (≤15 min) | `auth.guard.ts` trusts JWT claims without a DB lookup; `JWT_EXPIRES_IN=15m` | P1 (mitigate by revoking refresh tokens) |
| **D10** | Low | `users.vendor_id` has no foreign key or role consistency check | Migration `…004` creates the column only | P1 |

---

## 7. Implementation plan

Sizing: **S** ≤ 0.5 day, **M** ≈ 1 day, **L** ≈ 2+ days. Phases are ordered by dependency; P2 and P3 can run in parallel after P1.

### Phase 0 — Verify & unblock (S)

1. Log in as `vendor@marketplace.dev` and confirm both pages load (§3.2). Record any runtime errors, since they would change this plan.
2. Check `GET /api/catalog/vendor/<id>/dashboard` returns non-zero `pendingSyncJobs` for a vendor with in-flight line items. This is expected to **fail today** because of D3, which gives a before/after proof.
3. **Immediate personal unblock** (optional): link your own account with the SQL in §8.

**Acceptance:** baseline recorded; B5 decision confirmed.

### Phase 1 — Make the portal reachable (M–L) — *fixes D1, D2, D9, D10*

**1.1 Backend: vendor-account linking** (`admin` module)

| Method & path | Purpose | Auth |
|---|---|---|
| `GET /api/admin/vendors/:vendorId/users` | List accounts linked to a vendor | ADMIN, OPERATIONS |
| `POST /api/admin/vendors/:vendorId/users` body `{ email }` | Link an existing user | **ADMIN only** |
| `DELETE /api/admin/vendors/:vendorId/users/:userId` | Unlink (user returns to `buyer`) | **ADMIN only** |

Rules for `POST`:
- Run in **one transaction**; lock the user row (`pessimistic_write`).
- `404` if user or vendor not found.
- Idempotent if already linked to *this* vendor.
- `409` if linked to a *different* vendor, or if the user is `admin`/`operations` (never demote privileged roles via this path).
- Set `role = vendor`, `vendor_id = :vendorId`.
- **Revoke the user's refresh tokens** so the next login issues correct claims (mitigates D9). On unlink, do the same.
- Write an audit-log entry with the correlation ID. *Note: `AuditAction` is a Postgres enum, so new values require a migration; follow the precedent in `…011-FixAuditEntityEnum`.*
- *Verify:* the admin controller has a class-level `@Roles(ADMIN, OPERATIONS)`. Confirm `RolesGuard` lets a method-level `@Roles(ADMIN)` override it before relying on that for the ADMIN-only routes.

**1.2 Migration (additive, zero-downtime style, consistent with the project's expand-and-contract theme)**

```sql
-- pre-check: SELECT id FROM users WHERE role = 'vendor' AND vendor_id IS NULL;  (must return 0 rows)
ALTER TABLE users ADD CONSTRAINT fk_users_vendor
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT fk_users_vendor;

ALTER TABLE users ADD CONSTRAINT chk_users_vendor_role
  CHECK (role <> 'vendor' OR vendor_id IS NOT NULL) NOT VALID;
ALTER TABLE users VALIDATE CONSTRAINT chk_users_vendor_role;
```

Multiple staff accounts per vendor are allowed (no unique constraint on `vendor_id`); see open question Q2.

**1.3 Admin UI** (`admin/vendors/page.tsx`)
- Per-vendor "Linked accounts" panel with "Link user by email" and "Unlink" actions.
- Show a clear message that the user must sign out and back in.

**1.4 Storefront access UX**
- `StorefrontFooter` "Sell" links become role-aware:
  - Logged out → `/login?redirect=/vendor/dashboard`
  - Buyer → new **`/sell`** page
  - Vendor → straight to the portal
- New static page `app/(storefront)/sell/page.tsx`: "Vendor accounts are set up by the marketplace team", with a link to the existing `/contact-support`.
- `useRoleGuard`: when redirecting a wrong-role user, show a toast ("This area is for vendor accounts") instead of redirecting silently.

**1.5 Docs:** README section listing demo accounts and how to provision a vendor.

**Acceptance criteria**
- Admin links a buyer account → after re-login the account menu shows "Vendor Portal" and `/vendor/dashboard` loads that vendor's data.
- A buyer clicking a "Sell" link lands on `/sell`, never on a silent redirect.
- Vendor A cannot read or modify vendor B's dashboard/products (automated test).
- Unlinking removes access within one token lifetime at most (refresh tokens revoked immediately).
- Migration passes on a database containing existing users.

### Phase 2 — Fix the existing portal pages (S) — *fixes D3, D8*

- **D3:** replace the chained `.select()` calls with `.select()` + `.addSelect()` + `.addSelect()` and drop the unnecessary `groupBy`.
  ```ts
  .select("SUM(CASE WHEN line_item.fulfillment_status IN ('pending','syncing') THEN 1 ELSE 0 END)", 'pending')
  .addSelect("SUM(CASE WHEN line_item.fulfillment_status = 'dead_letter' THEN 1 ELSE 0 END)", 'dead')
  .addSelect("SUM(CASE WHEN line_item.fulfillment_status = 'ambiguous' THEN 1 ELSE 0 END)", 'amb')
  ```
  Add a regression test that seeds line items in each state and asserts the three counts.
- **D8:** make `analytics/page.tsx` use `useVendorId()` like the other pages; remove the default `VENDOR_ID` parameters from the vendor-scoped API functions so a missing tenant becomes a compile-time/explicit error rather than a silent wrong-tenant call.
- **D8 (Settings):** do not leave fake data on screen. Either mark it "Coming soon" (consistent with Promotions) or hide it from the sidebar until it is backed by real vendor profile columns (deferred, §10).

**Acceptance:** dashboard counters match a direct SQL count; analytics loads for a real vendor; no page falls back to a hardcoded vendor id.

### Phase 3 — Complete Manage Products (M–L) — *fixes D4–D7*

**3.1 Backend hardening**
- `CreateProductDto`: `@IsInt() @Min(0)` for `stockCount`; `@IsNotEmpty() @MaxLength(255)` for `name`; price validated to ≤ 2 decimal places.
- `createProduct()` persists `description` and `images`.
- Validate `category` against the `categories` table and return a clean `400` instead of relying on the FK error.
- *Verify:* whether `slug` has a uniqueness constraint; if two products can derive the same slug, define collision handling.
- Audit-log product create / update / deactivate / reactivate (`AuditEntityType.PRODUCT` already exists; add actions via migration if needed).

**3.2 Audited stock adjustments (recommended — this is what ties the feature to the PRD's core guarantee)**
- New `POST /api/inventory/:productId/adjust` with body `{ delta: int, reason: string }`; auth VENDOR (own products) / ADMIN.
- Runs in a transaction with `pessimistic_write` on the product row (same pattern as `decrementStock`), rejects if the result would be negative, and writes an audit entry with correlation ID.
- Delta semantics (not "set to N") avoid lost updates against concurrent sales.
- Vendor `PATCH /catalog/:id` no longer accepts `stockCount` from vendors (ADMIN may still); migrate `vendor/inventory/page.tsx` (currently using `updateStock` → `PATCH`) to the new endpoint.
- Test: concurrent checkout + vendor adjustment never produces negative stock (reuse the pattern in `inventory.concurrency.spec.ts`).

**3.3 Frontend** (`vendor/products/page.tsx`)
- Add **description** (textarea) and **image URLs** (https only, bounded count). Image *upload/CDN* is deferred (Blueprint B1).
- Replace the free-text category input with a **select** populated from `GET /api/catalog/categories`.
- On edit, **send only changed fields** (fixes the avoidable-`409` half of D7); stock is no longer part of this form.
- Add search box, Active/Inactive filter and client-side pagination for the table.
- Keep the existing `409` "changed elsewhere" handling.

**Acceptance criteria**
- Create with description + images → visible on the product detail page.
- Invalid category / fractional stock / empty name → clear `400` message in the UI.
- Editing only the price succeeds even if a sale happened since the page loaded.
- Every create/update/deactivate/stock-adjust appears in audit logs with a correlation ID.
- Cross-tenant attempts return `403` for every route in §3.1 (automated).

### Phase 4 — Tests & documentation (M)

| Area | Tests |
|---|---|
| Backend unit | Link/unlink rules (409 cases, idempotency, refresh-token revocation); dashboard counts (D3); DTO validation; stock-adjust negative-stock rejection |
| Backend e2e (`apps/backend/test/e2e`) | Vendor A vs vendor B isolation across dashboard, manage list, create, patch, delete, adjust |
| Frontend (Jest + RTL, existing setup) | Footer role-aware links (logged out / buyer / vendor); products page create, edit-dirty-fields, deactivate, `409` path |
| Docs | README (demo accounts, provisioning), update or retire the stale vendor sections of `IMPLEMENTATION_PLAN.md` |

---

## 8. Appendix

### 8.1 Immediate unblock for your own account (development only)

```sql
-- 1) find a vendor id
SELECT id, name FROM vendors;

-- 2) link your account (replace values), then sign out and back in
UPDATE users
SET role = 'vendor', vendor_id = '<vendor-uuid>'
WHERE email = '<your-email>';
```

Because the guard trusts JWT claims (D9), the change appears only after you log out and in again (or the 15-minute access token expires and is refreshed).

### 8.2 Files expected to change

| Area | Files |
|---|---|
| Backend | `admin/admin.controller.ts`, `admin.service.ts`, `dto/admin.dto.ts`; `catalog/catalog.service.ts`, `dto/catalog.dto.ts`; `inventory/inventory.controller.ts`, `inventory.service.ts`, `dto/inventory.dto.ts`; `common/audit/audit-log.entity.ts`; new migrations under `database/migrations/` |
| Frontend | `components/storefront/StorefrontFooter.tsx`; new `app/(storefront)/sell/page.tsx`; `lib/hooks/use-role-guard.ts`; `app/(operational)/admin/vendors/page.tsx`; `app/(operational)/vendor/{products,analytics,settings,inventory}/page.tsx`; `lib/api.ts`, `lib/types.ts` |

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| B5 decision changes to self-service | Phase 1 is isolated to the `admin` module and footer UX; re-plan only that phase |
| Migration on `users` table | `NOT VALID` then `VALIDATE`, with a pre-check query; follows the project's own zero-downtime convention |
| Postgres enum changes for audit actions | Follow the precedent migration `…011`; test on a copy of the schema first |
| Stale claims after link/unlink | Revoke refresh tokens; document the ≤15-minute window |
| `IMPLEMENTATION_PLAN.md` is stale and may mislead future work | Update or retire the affected sections in Phase 4 |

---

## 10. Explicitly out of scope (deferred)

Self-service vendor registration and KYC; payouts, commission and settlements; promotions CRUD; vendor profile/settings persistence (needs new vendor columns); image upload and CDN; bulk CSV product import; per-vendor staff roles and permissions. Each maps to a later phase or an undecided item in the Master Blueprint.

---

## 11. Open questions for review

1. **Q1 — Onboarding model:** confirm B5 option (a), admin-mediated?
2. **Q2 — Accounts per vendor:** allow several staff accounts per vendor (assumed yes), or strictly one?
3. **Q3 — Who may link users:** ADMIN only (assumed) or also OPERATIONS?
4. **Q4 — Images:** are URL-only images acceptable for now, with upload deferred?
5. **Q5 — Stock edits:** delta-with-reason adjustments (recommended) or keep "set absolute value"?
6. **Q6 — Settings page:** hide it until backed by real data (assumed), or build vendor profile fields now?
