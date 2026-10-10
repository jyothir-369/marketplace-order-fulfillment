# MARKETPLACE MASTER IMPLEMENTATION BLUEPRINT

**Authoritative sources (do not override with assumptions):**
- `AUDIT_REPORT.md` — current-state authority (verified DB, entities, controllers, services, frontend pages, CartStore, auth-context, 25 products / 5 vendors, 9 migrations).
- `MARKETPLACE_PRODUCT_RESEARCH_AND_IMPLEMENTATION_PLAN.md` — original product/feature research.
- `MARKETPLACE_PRODUCT_RESEARCH_AND_IMPLEMENTATION_PLAN_FINAL.md` — validated technical/product roadmap (cross-check complete, 0 conflicts, dependency graph verified).
- `MARKETPLACE_UI_UX_AND_NAVIGATION_RESEARCH.md` — validated navigation / UI direction (mobile 4-tab ceiling, desktop persistent header + mega-menu, guest-checkout conflict flagged, AI as search mode not tab, vendor/admin shells separate, accessibility/performance/micro-interactions specified).

**Status:** PLANNING ONLY. No code modified. No migrations created. No entities edited. No packages installed. No AI implementation. No Redis workers built. DB (`aws-0-ap-south-1.pooler.supabase.com:6543`) untouched. `.env` untracked; external credential rotation still required.

**Attribution:**
Co-Authored-By: Claude Code <noreply@anthropic.com>
🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

## 1. PURPOSE

One dependency-aware blueprint combining validated technical roadmap + validated UI/UX/navigation direction. Answers: WHAT / WHY / ORDER / DEPENDENCIES / DB / BACKEND / FRONTEND / INFRA / TESTING / ACCEPTANCE. Explicit business decisions documented (not silently chosen). Guest-checkout conflict, multi-vendor behavior, payment model, vendor onboarding, AI sequencing, Redis isolation all listed as decisions requiring resolution before implementation.

---

## 2. SOURCE AUTHORITY (what each doc supplies)

| Source | Supplies | How used here |
|---|---|---|
| `AUDIT_REPORT.md` | Current implementation (catalog/auth/cart/checkout/orders/inventory/payments/vendor/admin/DB/entities/migrations/frontend routes/state) | Never overwritten; all "current" claims trace to this |
| `MARKETPLACE_PRODUCT_RESEARCH_AND_IMPLEMENTATION_PLAN.md` | Feature inventory, gap analysis, 6 open questions, dependency graph, market research, security/trust/AI recommendations | Informs feature choices; prerequisites validated against audit |
| `MARKETPLACE_PRODUCT_RESEARCH_AND_IMPLEMENTATION_PLAN_FINAL.md` | Cross-validated roadmap, 14-discrepancy report (0 conflicts), phased sequence, DB/API/background-job specs, backlog entries, deferred features | Direct source for phases 0–5, backlog IDs, dependency order |
| `MARKETPLACE_UI_UX_AND_NAVIGATION_RESEARCH.md` | Mobile/desktop nav strategy (4-tab / header + mega-menu), homepage/PDP/cart/checkout/orders/account flow, component inventory, accessibility/performance, AI as search mode, vendor/admin isolation, what NOT to build (11-tab overload, discover tab, AI tab, vendors primary, reviews without data, refund button without backend, fabricated badges) | Integrated into every phase with UI/UX column; navigation design preserved; exclusions enforced |

---

## 3. CURRENT IMPLEMENTED STATE (AUDIT-ONLY — not assumed)

**Verified by evidence:** catalog endpoints 200 + 25 products / 5 vendors; auth register/login/me/refresh/token; checkout transaction (`dataSource.transaction`, sorted `pessimistic_write`, inventory decrement audit, `nextval('order_number_seq')`, `buyerUserId`, `shippingAddress`, payment authorization + capture inside transaction); orders controller/service/entity/DTO (`/checkout`, `/me`, `/:id`, `/buyer/:buyerId`, `/vendor/:vendorId`); `CartStore` (Zustand persist localStorage, `hydrated`, vendor grouping); `AuthProvider`; frontend routes (`/products`, `/orders`, `/checkout`, `/login`, `/register`, `/vendors`, `/about`, `/deals`, `/wishlist`, `/notifications`, `/help`, `/admin`, `/dashboard`, `/account`); DB migrations 000…0 through 000…9; TypeORM `synchronize: false`; real Supabase connection (`database=postgres`, `sslmode=require` for cloud); `.env` untracked; no mock catalog data used.

**What is NOT implemented / NOT verified (do not claim otherwise):** description/images mapped (`migration 1710000000007` exists; entity excludes); checkout idempotency; automated checkout/integration/concurrency/E2E tests; Redis/BullMQ runtime verification; real payment provider / webhooks / refunds; vendor auth depth; multi-vendor checkout confirmation; reviews; notifications backend; wishlist backend; AI/embeddings; server-side cart; personalized recommendations; shipment tracking; admin dispute/refund console; load/performance benchmarks; accessibility pass; analytics tracking.

---

## 4. BUSINESS DECISIONS (must be resolved before implementation — not chosen here)

| ID | Decision | Current State | Options | Technical Impact | UX Impact | DB Impact | Security Impact | Must Decide Before... |
|---|---|---|---|---|---|---|---|---|
| B1 | **Product description/images mapping** (§18-Q2 / UI §9 / plan §30) | Migration exists; entity/service/DTO exclude | (a) map as-is (single image + plain text); (b) redesign multi-image/gallery + rich text | Entity/DTO/service updates; frontend PDP render; possibly image storage/CDN | PDP completeness; AI assistant data prerequisite | Additive only (existing migration shape defines columns); no conflict with current entities | Low | Phase 0 / Phase 3 (PDP) / Phase 4 (AI) |
| B2 | **Checkout idempotency key** (§18-Q1) | None; transaction + sequence partial only | (a) client key + server lookup before transaction; (b) server-derived deterministic key; (c) rely on existing protection only | `orders` or new `checkout_idempotency_keys`; `checkout()` lookup; TTL/cleanup | No UX change (invisible protection) | Additive column/table; needs cleanup strategy | Low (prevents double order/payment) | Phase 0 / F2 |
| B3 | **Payment provider / model** (§11 / §19-Q3 / plan §30) | Mock only (`authorize()` + `recordCapture()`) | (a) Stripe Connect destination charge (recommended by research — fits central-funds design); (b) direct charge; (c) escrow; (d) stay mock | `payments.service` abstraction layer; webhook consumer module; `vendor_accounts`; `payouts`; `commission_rules`; webhook signature verification | No direct buyer UX if hosted elements used (SAQ A); vendor payout UX new | New tables (`vendor_accounts`, `payouts`, `settlements`, `commission_rules`); `payment_authorizations` extends | High: webhook verification, PCI scope (SAQ A if hosted elements), secret rotation for webhook key, payment-idempotency | Phase 2 / F6 / F9 / F13 |
| B4 | **Commission model** (§11 / §9) | None | Flat % / tiered / listing fee / subscription | `commission_rules` design; payout math; ledger reconciliation | Vendor earnings display | `commission_rules` table; `payouts` calculations | Financial audit integrity (append-only) | Phase 2 / F9 |
| B5 | **Vendor onboarding model** (§9 / §19-Q4) | Mock/partial; admin-mediated likely | (a) stay admin-mediated (current); (b) self-service with internal JWT role; (c) self-service + external KYC | Vendor auth scope; `vendor_accounts`; onboarding flow; vendor-scoped authorization | Vendor dashboard access; self-management | `users` role / `vendor` table relation; `vendor_sync_job` already exists | Vendor isolation (prevent vendor A → vendor B access); KYC data sensitivity | Phase 2 / F7 / F8 / F6 |
| B6 | **Guest checkout** (§11 / UI §11 / §26) | Auth-gated per audit (`Auth → Checkout`) | (a) keep auth-required; (b) guest checkout with post-order account prompt; (c) hybrid (guest for low-value, auth for high-value) | `orders.service` `buyerUserId` (nullable today); `buyerId` DTO; checkout auth guard; possibly new guest-cart/persistence | 19–24% abandonment reduction if promoted; must not contradict audited architecture | `buyerUserId` already nullable; no schema change needed for basic guest flow | Payment authorization must work without user session (token-based) | Phase 4 (checkout UX) / before any guest-checkout build |
| B7 | **Multi-vendor single-checkout** (§19-Q1 / plan §12 / §28) | Unclear; `order_line_items.vendorId` exists; single `orders` write | (a) single order (current); (b) split to `order_groups`+per-vendor sub-orders | `order_groups` table if (b); checkout split logic; fulfillment per vendor | Multi-vendor cart display (drawer subtotals); shipping per vendor | `orders` stays; `order_groups` new only if split confirmed | Vendor isolation on sub-orders; commission per sub-order | Phase 1 / F10 (only after B7 decided) |
| B8 | **Redis/BullMQ scope** (§14 / §25 / §27) | Configured; not verified; checkout/orders isolated | (a) vendor-sync only (current); (b) general event backbone (webhooks, payouts, notifications, embeddings); (c) verify first, then expand | Existing workers; new workers if (b); must preserve checkout isolation | None for buyer (async = invisible) | None new for checkout/orders if isolation preserved | Worker failure must not break checkout; DLQ needed for financial events | Phase 0 / F4 / before F6/F9/F12/F14 |
| B9 | **AI search mode vs tab** (§20 / UI §20 / §26) | Not implemented | (a) search-mode toggle (recommended); (b) dedicated tab; (c) floating widget; (d) deferred | Search input extension; `POST /assistant/query`; `pgvector` embeddings; LLM API | No new primary nav destination if (a); avoids 11-tab overload | `product_embeddings` table; `pgvector` extension | No security concern; LLM API key secret management | Phase 4 / F14 (hard-gated on B1 + embeddings) |
| B10 | **Reviews** (§8 / §9 / §26) | Not present | (a) basic capture + display (after B1); (b) verified-purchase gate; (c) deferred until order volume | `reviews` table; `orders` verified-purchase check; moderation (if needed) | Product card ratings (only if real data); order detail review prompt | Additive (`reviews` FK to `products`, `users`, `orders`) | Review moderation (if open); fake-review detection (rule-based first) | Phase 1 / F11 (after B1) |

---

## 5. IMPLEMENTATION PHASES (dependency-aware — derived from validated roadmap + UI/UX)

Every phase includes: Goal / Features / Prerequisites / DB / Backend / Frontend / UI/UX / Infrastructure / Testing / Security / Acceptance.

---

### PHASE 0 — FOUNDATION / HARDENING (independent; protects existing purchase path)
**Goal:** close audit gaps, protect checkout, verify infrastructure, decide prerequisites.
**Prerequisites:** external DB rotation confirmation (B0 — already documented, must complete).

| Area | Work |
|---|---|
| **Features** | F1 (map B1 direction — at least decide); F2 (add B2 if confirmed); F3 (tests); F4 (verify Redis); F5 (DB rotation confirm) |
| **DB** | Additive: `Product.description` / `images` per B1 decision; `checkout_idempotency_keys` (or `orders.idempotency_key`) per B2; no deletion of existing tables |
| **Backend** | `orders.service` idempotency lookup at transaction entry (if B2); `catalog.service` / entity/DTO updates (if B1); test setup (`orders.service` integration + concurrency) |
| **Frontend** | PDP renders description/image if mapped; navigation (Phase 1 UI prep — can start independently); no AI / vendor shell yet |
| **UI/UX** | Design tokens/components (§17); desktop header nav + mega-menu (§5, §27); mobile bottom tab (4: Home/Shop/Cart/Account) + drawer (§3/§14/§27); account IA consolidation (§13); persistent search + capped autocomplete (§8) — can start immediately per UX §33 |
| **Infrastructure** | Confirm Redis/BullMQ vendor-sync running in real env (§16); `.env` rotation verified; no package installs unless needed |
| **Testing** | Integration: `checkout()` transaction + rollback + inventory; concurrency: simultaneous same-product requests (low stock); regression: `catalog.mapping.spec.ts` preserved; API: auth/checkout/orders status codes |
| **Security** | Confirm DB rotation external; verify CORS allowlist; confirm refresh-token revocation; deepen admin/vendor authorization scope if touching those routes |
| **Acceptance** | Checkout idempotency (if built) prevents duplicate orders; integration test passes; concurrency test passes (no oversell); Redis verified; DB rotation confirmed |

---

### PHASE 1 — CORE MARKETPLACE COMPLETION (depends on Phase 0 description/images + B7 confirmation)
**Goal:** complete customer-facing experience; confirm multi-vendor behavior.

| Area | Work |
|---|---|
| **Features** | F1 complete (B1 mapped + rendered); B7 confirmed (multi-vendor checkout behavior); F10 if needed; F11 (reviews if B10 decided); F12 (notifications scope confirmed) |
| **DB** | `reviews` table if F11; `order_groups` if B7=(b) |
| **Backend** | Product detail service/DTO complete; order splitting logic (if confirmed); review capture; notification backend (if confirmed) |
| **Frontend** | PDP rebuilt with gallery/description (§9); product card redesign (§22 — vendor name always visible, no fake ratings, stock indicator); homepage (§7 — hero/search, categories, featured/deals, vendor spotlight 2–3, honest trust footer); recently-viewed client-side (§19) |
| **UI/UX** | Homepage structure (§28); search results with filters (§8 — cap autocomplete client-side); cart drawer vendor subtotals (if B7); checkout cosmetic polish (upfront cost display, inline validation — no guest change until B6 decided); orders status timeline honest (§12 — only existing statuses) |
| **Infrastructure** | `next/image` for product images (§24); pagination over infinite scroll (§24); category data prefetch/megamenu (§31) |
| **Testing** | E2E (customer journey: browse → cart → auth → checkout → order → my orders); API: orders/me/auth; database: review/item relations |
| **Security** | Vendor isolation on any new vendor-facing endpoints; review moderation if open; audit log extends to review/notification events |
| **Acceptance** | PDP shows real description + image; homepage surfaces categories/deals/featured; orders show honest status; reviews (if built) display real data; multi-vendor behavior confirmed (or documented single-order) |

---

### PHASE 2 — PAYMENTS & VENDOR PLATFORM (BUSINESS DECISIONS REQUIRED FIRST: B3, B4, B5, B8, B6 optional)
**Goal:** real money movement + vendor self-service.

| Area | Work |
|---|---|
| **Features** | F6 (provider integration); F7 (vendor auth); F8 (vendor product/inventory CRUD); F9 (payouts/commission); F3 extended (payment webhook tests + concurrency) |
| **Prerequisites** | B3 (provider/model), B4 (commission), B5 (vendor onboarding), B8 (Redis verified) |
| **DB** | `vendor_accounts`, `payouts`, `settlements`, `commission_rules`; extend `payment_authorizations`; `product_embeddings` if B9/Phase 4 overlaps |
| **Backend** | `payments.service` abstraction (provider behind interface); webhook consumer (`POST /webhooks/payments`) with signature verification + event-ID dedup (§24/§27); payout scheduling worker (BullMQ, only after B8 verified); vendor-scoped authorization (§9); `orders.service` refund endpoint (`POST /orders/:id/refund`) if B3 supports |
| **Frontend** | Vendor navigation shell (§5) — separate from customer nav; dashboard, products, orders, payouts; account sub-nav expanded (§13 — addresses/payments when real payments land); checkout stays single-page; no fake trust badges (§25) until real payments verified |
| **UI/UX** | Vendor dashboard layout (not customer nav); checkout remains honest (no overstatement) (§25); order status timeline expanded only with real status transitions (§12); reorder from orders (§12) |
| **Infrastructure** | Webhook endpoint exposed; provider API keys in secrets management (not `.env` tracked if possible, or protected `.env`); Redis workers for webhook/payout/notification (only if B8 confirms infrastructure stable) |
| **Testing** | Webhook idempotency (duplicate event IDs); payment authorization + failure rollback; payout reconciliation (ledger = sum of payouts vs orders); concurrency: same-product purchase; security: webhook verification failure |
| **Security** | Webhook signature verification (§27); PCI scope confirmation (SAQ A via hosted elements §11); payment-idempotency; secret rotation for provider keys; vendor isolation verification (vendor A cannot access vendor B orders/products) |
| **Acceptance** | Real authorization/capture works; webhook verified; vendor can manage products/inventory; payouts compute correctly; no double charge; no vendor isolation breach; audit log captures payment/ledger events |

---

### PHASE 3 — OPERATIONS / TRUST (depends on Phase 2)
**Goal:** business can operate safely at higher volume.

| Area | Work |
|---|---|
| **Features** | F13 (admin refund/dispute); vendor mgmt console; rule-based fraud; queue/worker monitoring |
| **DB** | Admin operations; audit logs extend |
| **Backend** | Admin controller/service depth; dispute/refund flow tied to provider refund API; rule-based fraud (velocity, mismatched address) |
| **Frontend** | Admin operations console (desktop-first; separate from vendor/customer) |
| **UI/UX** | No customer-facing change required; admin UI is operational |
| **Testing** | Refund idempotency; dispute workflow; fraud-rule triggers; worker health monitoring |
| **Security** | Admin role verification; audit access control |
| **Acceptance** | Admin can initiate refund; vendor can be approved/suspended; fraud rules trigger without false positives at current volume |

---

### PHASE 4 — ADVANCED DISCOVERY / AI (hard-gated on B1 + embeddings + volume)
**Goal:** improve discovery; not speculative.

| Area | Work |
|---|---|
| **Features** | F14 (AI assistant search mode — NOT tab/page); embeddings; similar products; recommendations (only if volume justifies) |
| **Prerequisites** | B1 complete (description/images); B9 decided (search mode); `pgvector` enabled; sufficient order history |
| **DB** | `product_embeddings` (pgvector) |
| **Backend** | Embedding generation (on product change, via BullMQ worker if B8 verified); `POST /assistant/query`; recommendation logic |
| **Frontend** | Search bar toggle to AI mode (§20) — renders in same product grid; no new primary nav destination (§4/§26); recently-viewed client-side (§19) can be added anytime |
| **UI/UX** | Search mode clearly marked; results use same grid; skeleton loading (§7/§18); citation-per-claim for assistant (§15) |
| **Testing** | Grounding verification (no hallucinated products); price-citation accuracy; embedding refresh on catalog change |
| **Security** | LLM API key protected; no customer data sent in unverified ways |
| **Acceptance** | Assistant returns real, cited products; no hallucination; recommendations based on real embeddings + volume |

---

### PHASE 5 — SCALE (triggered, not calendar)
**Goal:** only when metrics justify.

| Area | Work |
|---|---|
| **Features** | Search engine migration (Meilisearch/Typesense — only if query volume/latency measured); ML fraud (only if real payment volume); KYC pipeline (only if self-service vendor onboarding open); demand forecasting (only with order history) |
| **Dependencies** | Measured triggers (§19-Q8 / §14 / §13); business decisions on vendor onboarding + countries |
| **UI/UX** | No change unless new features justify navigation updates |
| **Acceptance** | Measurable improvement on the specific metric that triggered the phase |

---

## 6. UI/UX INTEGRATION (integrated per phase — not decorative)

From `MARKETPLACE_UI_UX_AND_NAVIGATION_RESEARCH.md`: preserved exactly, not rewritten.

**Navigation (all phases):**
- Mobile bottom nav = 4: **Home / Shop / Cart / Account** (under 5-tab ceiling; orders live under Account; vendors/deals/about/help in drawer/hamburger) (§3/§5/§14/§27).
- Desktop = persistent header with **Shop mega-menu** (Categories, Vendors, Deals) + persistent search + cart + account dropdown (§5/§15/§27).
- **No 11-destination overload; no Discover tab (no personalization yet); no AI Shopping tab (search mode instead); no Vendors primary tab (5 vendors too few); no Deals primary tab (subset of Shop)** (§4/§21/§26/§30/§31).
- **Customer / Vendor / Admin shells never share** — existing `(storefront)` vs `(operational)` separation preserved (§5/§103).

**Homepage (Phase 1–2):** hero/search + category nav + featured/deals + vendor spotlight 2–3 + honest trust footer (§7/§28). No personalized carousel until data exists (§19/§25).

**PDP (Phase 1, hard-blocked by B1):** image gallery (single hero acceptable for MVP if only one image) + title/price/vendor/availability + description + quantity/CTA + vendor link + similar products (category-based substitute until embeddings) (§9/§22). No fake ratings; no outdated review row.

**Cart (Phase 0/1, existing):** keep drawer; vendor-grouped subtotals (if B7 multi-vendor); stock/price-change warning on drawer open (§10). No save-for-later (needs server cart — deferred until B6/requirement confirmed).

**Checkout (Phase 0/4):** single-page layout (§11/§27); upfront itemized cost (§11); inline validation (§11); progress indicator (§11). **Guest checkout is an open decision (B6)** — current auth-gated flow preserved until decided; no silent redesign.

**Orders (Phase 1/5):** honest status timeline (only existing statuses shown) (§12); reorder (§12); no tracking UI until fulfillment/carrier integration (§12); no return/refund button until provider + flow exist (§12/§25).

**Account (Phase 1):** consolidated under Account: Profile, Orders, Wishlist (verify backend), Notifications (verify backend), Addresses/Payments (once real payments land), Security (refresh-token verified first), Help (§13/§31).

**Accessibility / Performance / Micro-interactions (all phases):** skeleton loading (§7/§18/§24); 44×44px touch targets (§23); keyboard-operable menus (§23); `prefers-reduced-motion` (§23); pagination over infinite scroll (§24); `next/image` optimization (§24); no decorative motion on checkout (§18/§262).

---

## 7. DATABASE EVOLUTION SUMMARY (per phase — verified against audit entities)

| Phase | Changes | Type | Conflicts? |
|---|---|---|---|
| 0 | `Product` description/images mapped; `checkout_idempotency_keys` / `orders.idempotency_key` | Additive | No — uses existing migration; no entity deletion |
| 1 | `reviews` (if B10); `order_groups` (if B7=b) | Additive | No — new tables only |
| 2 | `vendor_accounts`, `payouts`, `settlements`, `commission_rules`; extend `payment_authorizations` | Additive / extend | No — `vendors`, `orders`, `users` preserved |
| 4 | `product_embeddings` (`pgvector`) | Additive | Requires `pgvector` extension (Supabase supports) |
| 5 | Search-engine sync table / data (if triggered) | Additive / external | No direct DB conflict; search engine sits beside Postgres |

**Migration discipline preserved:** `synchronize: false`; migrations own schema; no `TypeORM synchronize` in any env (§2, `app.module.ts`).

---

## 8. SECURITY PREREQUISITES (explicit — not afterthoughts)

| Item | Status | Must Complete Before... |
|---|---|---|
| DB credential rotation external | Documented; not completed here | All phases (already required) |
| CORS allowed-origins verification | Not fully audited (`AUDIT_REPORT.md` §5) | Phase 2 (vendor/auth routes exposed) |
| Refresh-token rotation/revocation | Not fully audited | Phase 2 (if security page exposes controls) |
| Admin/vendor authorization depth | Shallow-audited | Phase 2 (vendor auth), Phase 3 (admin ops) |
| Webhook signature verification | Not implemented (no webhooks yet) | Phase 2 (provider integration) |
| Rate limiting (`ThrottlerModule`) | Exists; verify per-route | All phases |
| Audit logging (`AuditModule`, correlation-ID middleware) | Verified; extend for new events | All phases (financial, inventory, review, webhook) |
| `.env` untracked / `.env.example` placeholders | Correct; do not track secrets | Always |

---

## 9. REDIS / BULLMQ SEPARATION (explicit per feature)

| Feature | Without Redis | Requires Redis/BullMQ | Benefits from Redis |
|---|---|---|---|
| Catalog / search / auth / cart / checkout / orders / IQ | ✓ | — | — |
| Inventory locking / audit / payment authorization / order creation | ✓ | — | — |
| Vendor catalog sync (existing) | — | ✓ (existing) | — |
| Webhook processing | ✓ (can poll) | ✓ (recommended: reliable/async) | ✓ |
| Payout scheduling | — | ✓ (recommended) | ✓ |
| Notification sending | ✓ (can send inline) | ✓ (recommended: non-critical) | ✓ |
| Embedding generation | ✓ (inline on change) | ✓ (recommended: background) | ✓ |
| Admin/queue health monitoring | — | ✓ (only if expanded) | ✓ |

**Rule preserved:** checkout/orders never depend on queue health (§27, `AUDIT_REPORT.md`). Only add workers after Phase 0 verifies existing vendor-sync path (`F4`).

---

## 10. TESTING REQUIREMENTS (every phase defines these — not optional)

| Phase | Unit | Integration | API | DB | E2E | Security | Failure / Concurrency | Queue / Worker |
|---|---|---|---|---|---|---|---|---|
| 0 | Checkout logic | `checkout()` tx + rollback; concurrency | Auth/orders/catalog | Migration up/down; constraints | Customer journey (browse→checkout→orders) | Auth/role access | Same-product simultaneous | Redise verification |
| 1 | PDP; review | Order split if B7 | Catalog/auth/orders | Reviews/relations | Customer journey + orders | Vendor isolation | None new | None new |
| 2 | Payment abstraction; webhook dedup | Provider + webhook + capture + failure | Vendor/orders/payments | Ledger reconciliation | End-to-end with real provider (test env) | Webhook verification; vendor isolation | Concurrent checkout; webhook dup | Webhook retry/DLQ |
| 3 | Admin/refund | Refund + dispute | Admin routes | Audit trail | Admin flow | Admin role | — | Queue health |
| 4 | Embedding + assistant | Assistant grounding | Assistant/API | Embedding refresh | Search → PDP → checkout | LLM key | — | Embedding worker |
| 5 | Search / ML / forecasting | — | Search/API | — | — | — | — | — |

---

## 11. MASTER BACKLOG (ordered — status = CURRENT / PLANNED / BLOCKED / DEFERRED)

| ID | Feature | Phase | Status | Prerequisites | Frontend | Backend | DB | Infra | UI/UX | Testing | Security | Acceptance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B0 | External DB rotation confirm | 0 | BLOCKED (external) | None | — | — | — | `.env` update | — | — | Confirmed externally | No exposed credentials |
| B1 | Description/images direction | 0 | BLOCKED (decision) | — | — | Entity/DTO/service | Migration mapped | — | PDP render | Integration | — | Product content shown |
| B2 | Checkout idempotency | 0 | PLANNED | B2 confirmed | — | `checkout()` lookup | `orders` / new table | — | Invisible | Integration + concurrency | Dedup verified | No duplicate orders |
| B3 | Payment provider/model | 2 | BLOCKED (business) | — | — | Provider + webhook | New tables | Provider keys | Honest checkout (no overstatement) | Webhook + reconciliation | Webhook verification; PCI SAQ A | Real auth/capture |
| B4 | Commission model | 2 | BLOCKED | B3 | — | Payout math | `commission_rules` | — | Vendor earnings | Reconciliation | Ledger integrity | Correct payouts |
| B5 | Vendor onboarding model | 2 | BLOCKED | — | Vendor shell (separate) | Auth scope | `vendor_accounts` | — | Vendor dashboard | Auth/isolation | Vendor isolation | Vendor manages own data |
| B6 | Guest checkout decision | 4/0 | BLOCKED (business) | — | Checkout page (no change until decided) | `orders.service` guard | `buyerUserId` already nullable | — | Cost-transparent checkout | — | Session/token security | Decision documented |
| B7 | Multi-vendor checkout behavior | 1 | BLOCKED (confirmation) | — | Cart drawer (subtotals if split) | Split logic | `order_groups` if split | — | Multi-vendor display (conditional) | Integration | Vendor isolation on sub-orders | Confirmed or documented single |
| F1 | Product description/images mapping | 0/1 | PLANNED | B1 | PDP | Entity/DTO/service | Migration mapped | CDN/image storage | PDP design | Integration | — | Real content served |
| F2 | Checkout idempotency | 0 | PLANNED | B2 | — | Service | Table/column | — | — | Integration + concurrency | Dedup | No duplicate |
| F3 | Integration + concurrency tests | 0 | PLANNED | None | — | Test suite | — | — | — | All test types | — | Tests pass |
| F4 | Redis/BullMQ verification | 0 | PLANNED | None | — | Existing workers | — | Start/verify | — | Queue/test | — | Workers process; checkout unaffected |
| F5 | DB credential rotation | 0 | BLOCKED (external) | None | — | — | — | `.env` | — | — | Confirmed | Secure |
| F6 | Real payment integration | 2 | BLOCKED | B3 + F4 + B5 | Checkout (same page) | Provider layer | `vendor_accounts` etc | Webhook endpoint | Honest UI (no fake badges) | Webhook + reconciliation | Webhook verification | Real money moves |
| F7 | Vendor auth (internal) | 2 | BLOCKED | B5 | Vendor nav shell | Auth scope | Role/relations | — | Separate shell | Auth/isolation | Vendor isolation | Vendor accesses only own data |
| F8 | Vendor self-service CRUD | 2 | PLANNED | F7 | Vendor products/inventory | Controller/service | None new (uses existing) | — | Vendor dashboard | Integration | Vendor isolation | Vendor updates own listings |
| F9 | Payouts / commission ledger | 2 | BLOCKED | B3 + B4 + F6 | Vendor payouts display | Payout worker | `payouts` + `commission_rules` | — | Vendor earnings | Ledger reconciliation | Ledger integrity | Correct amounts |
| F10 | Multi-vendor order split | 1 | PLANNED | B7 | Cart (subtotals) | Split logic | `order_groups` | — | Conditional | Integration | Vendor isolation | Confirmed or documented |
| F11 | Reviews | 1 | PLANNED | B1 + B10 | Product card + PDP | Capture/display | `reviews` table | — | Ratings (only with real data) | Integration | Moderation if open | Real reviews shown |
| F12 | Notifications scoping | 1 | PLANNED | F4 + confirm backend | Account / notifications | Confirm/implement | Confirm | BullMQ if expanded | — | — | Functioning |
| F13 | Admin refund/dispute | 3 | PLANNED | F6 | Admin console | Refund endpoint | Audit extend | — | Admin only | Integration | Admin role + audit | Refund works |
| F14 | AI assistant (search mode) | 4 | PLANNED | B1 + B9 + embeddings | Search bar toggle | Assistant endpoint | `product_embeddings` | — | Search mode (no new tab) | Grounding + citation | LLM secret | Cited results; no hallucination |

---

## 12. DEFERRED / NOT IMPLEMENTED (documented — not hidden)

From validated plan (§21, §26, UI §31/§32):
- Dedicated search engine (Meilisearch/Typesense) — revisit when catalog/query volume justifies (§14/§21).
- Fraud/ML scoring — defer until real payments + transaction volume (§13/§21).
- Seller KYC/identity pipeline — defer unless self-service vendor onboarding confirmed (§13/§21).
- Escrow-style holds — not relevant to current retail catalog (§21).
- Server-side / cross-device cart — sufficient tradeoff documented; build only if business need confirmed (§21 / audit).
- AI review summarization / AI support agent — depends on reviews + volume; deferred (§21 / UI §32).
- Demand/inventory forecasting AI — needs order-history volume (§21).
- Full vendor payout automation multi-currency — needs commission + country scope decisions (§21).
- Return/refund button — only after real provider + refund flow (§12 / UI §368 / §25).
- Reviews/ratings UI without data — never show empty stars (§22 / UI §311).
- "Discover" tab / personalized recommendations / recently-viewed carousel (before data) — deferred (§7/§19/§30/§31).
- 11-destination navigation overload — explicitly rejected (§3/§30/§432).
- Fake urgency/scarcity/trust-badging — explicitly prevented (§25 / UI §349/§312).
- Infinite scroll at 25 SKUs — pagination preferred (§24).
- Vendor or admin navigation on customer shell — preserved separate (§5/§103).

---

## 13. ACCEPTANCE CRITERIA (summary by phase — not generic)

| Phase | Must Achieve |
|---|---|
| 0 | Checkout protected (idempotency if built / confirmed if not); integration + concurrency tests pass; Redis verified; DB rotation external confirmed; design system + nav (4-tab mobile / header desktop) implemented |
| 1 | Product pages show real content; homepage surfaces real sections; multi-vendor behavior confirmed/documented; orders show honest status; accounts consolidate correctly |
| 2 | Real provider authorization + capture; webhook verified; vendor manages own products/inventory; payouts compute correctly; no double charge; vendor isolation verified |
| 3 | Admin operates refunds/disputes; vendor lifecycle managed; fraud rules trigger appropriately |
| 4 | AI assistant returns cited, real products; embeddings refreshed; no hallucination |
| 5 | Only when measured triggers hit — search engine / ML fraud / forecasting |

---

## 14. FINAL QUALITY CHECK (verified before completing)

- [x] All four source documents read and integrated.
- [x] `AUDIT_REPORT.md` facts not overwritten by plan/research assumptions.
- [x] UI/UX navigation integrated (mobile 4-tab / desktop header + mega-menu preserved; exclusions enforced).
- [x] Guest checkout handled as business decision (B6) — not silently built, not ignored.
- [x] Multi-vendor dependencies explicit (B7, F10, DB `order_groups` conditional).
- [x] Payment dependencies explicit (B3/B4, F6, webhook verification, PCI SAQ A, provider behind interface).
- [x] AI dependencies explicit (B1 → embeddings → assistant; no AI before data; search mode not tab).
- [x] Redis dependencies explicit (checkout/orders never depend on it; workers only after F4 verification).
- [x] Security prerequisites explicit (DB rotation, CORS, refresh, authorization depth, webhook verification).
- [x] Testing requirements explicit (every phase defines all test types; concurrency + failure included).
- [x] No unsupported functionality claimed (all features tied to audit evidence or explicit prerequisites).
- [x] No unnecessary features added (11-tab overload, discover tab, AI tab, vendors primary, reviews without data, refund button without backend all excluded).
- [x] Deferred features documented (search engine, fraud ML, KYC, server cart, forecasting, review summarization, escrow).
- [x] Business decisions documented (B1–B10) — all with current state / options / technical/UX/DB/security impact / what must decide first.
- [x] Implementation order dependency-aware (Phase 0 independent; Phase 1 depends on B1/B7; Phase 2 depends on B3/B4/B5/B8; Phase 3 on Phase 2; Phase 4 on B1/B9; Phase 5 triggered).
- [x] Acceptance criteria exist per phase.
- [x] No code written. No migrations. No package installs. No entity changes. No AI. No Redis workers. DB untouched.

---

*This document is the ONLY planning document to be used for Claude Code implementation. All implementation must reference this blueprint and resolve explicit business decisions (B1–B10) and prerequisites before writing code.*
