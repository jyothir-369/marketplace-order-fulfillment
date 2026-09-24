# FINAL CROSS-DOCUMENT VALIDATION — MARKETPLACE
Audit source: `AUDIT_REPORT.md` (created 2026-09-22, evidence-backed, no code changed).
Plan source: `MARKETPLACE_PRODUCT_RESEARCH_AND_IMPLEMENTATION_PLAN.md` (research/strategy doc, not code).
Validation: audit-only, no implementation. Conflicts / duplicates / unsupported assumptions documented.

## 1. VALIDATION METHODOLOGY
- Read audit sections 1–30 (executive, architecture, feature inventory, journey, auth, catalog, cart, checkout, orders, vendors, admin, inventory, payments, Redis, API, DB, performance, reliability, testing, devops, docs, code quality, gaps, missing capabilities, candidates, dependencies, debt, risks, research questions, next steps).
- Read plan sections 1–30 (baseline, journey, vendor, admin, marketplace research, CX gaps, vendor gaps, admin gaps, payments, fulfillment, trust/safety, search, AI, production engineering, security, 6 questions, feature inventory, NOT recommended, architecture, DB, API, background jobs, testing, security/failure, dependency graph, roadmap, specs).
- Cross-reference each major recommendation in plan against audit evidence (file/function/DB/verified behavior).
- Classify discrepancies: ALREADY IMPLEMENTED / PARTIALLY / MISSING / CONFLICT / DUPLICATE / UNSUPPORTED.

## 2. CROSS-VALIDATION BY MAJOR THEMES

### 2.1 Catalog / Product Discovery
- Plan §8 (CX gaps — product description/images): audit confirms migration 1710000000007 exists, entity/service exclude columns — genuine gap, not fabricated. Plan correctly references audit Q2.
- Plan §14 (search): audit verifies Postgres QueryBuilder + pagination + autocomplete; no typo tolerance verified; plan correctly says "not yet — revisit at low-thousands SKUs" — compatible.
- Plan §15 AI assistant: plan correctly states blocked on description/images (§8) — dependency valid. Plan references `pgvector` as shared infra — audit confirms Supabase Postgres exists, extension possible; no conflict.
- Plan §21 NOT recommended (search engine, fraud ML, KYC, escrow, server cart, review summarization, forecasting): all correctly labeled; audit supports (search adequate at 25 products; fraud/ML premature; server-cart documented as sufficient tradeoff; reviews don't exist yet).
- CONFLICT: None.
- DUPLICATE: None.
- UNSUPPORTED: None (all recommendations tied to audit evidence or cited research).

### 2.2 Checkout / Orders / Inventory (CRITICAL — money + inventory)
- Plan §11 payments / §16 production engineering / §18-Q1 idempotency: audit confirms checkout uses `dataSource.transaction`, sorted `pessimistic_write`, payment authorization, order + line-item writes, `order_number_seq`, audit logging — all verified by code read. Plan's recommendation to add idempotency key is correctly identified as missing (not invented). Plan's dependency order (idempotency independent, before payments) correct.
- Plan §27 security/failure scenarios (duplicate checkout, double capture, inventory race, webhook dup, worker failure, DB failure mid-transaction): matches audit findings exactly; no contradictions.
- Plan §12 fulfillment / order splitting: audit confirms `order_line_items.vendorId` exists; checkout currently writes a single `orders` row; plan correctly documents splitting as incremental (needs confirmation of multi-vendor checkout behavior first — audit Q1). No unsupported claim.
- Plan API §24 (`POST /checkout` extended with idempotency): design fits existing `CheckoutDto`; no architectural conflict.
- CONFLICT: None.
- DUPLICATE: None.
- UNSUPPORTED: None.

### 2.3 Auth / Security
- Plan §17 security gaps / §19-Q4 vendor auth / §18-Q4 auth: audit confirms JWT + refresh + rate limit (`ThrottlerModule`); `displayName` DTO fixed; `.env` untracked; DB rotation external; CORS/refresh-token not fully audited; `RequireRole` exists but deep scope not audited. Plan correctly says "confirm CORS / refresh / admin depth" rather than inventing roles.
- Plan §10 trust & safety / §13 fraud: correctly defers ML fraud scoring until real payments + volume exist; audit confirms only mock payments, 5 vendors, no fraud signals.
- Plan DB §23 (`vendor_accounts`, `payouts`, `commission_rules`, `reviews`, `product_embeddings`, `order_groups`): all new; none conflict with existing entities (additive). `order_groups` depends on confirmed multi-vendor behavior — correct dependency.
- CONFLICT: None.
- DUPLICATE: None.
- UNSUPPORTED: None.

### 2.4 Cart
- Plan §8 (cart UX / server-side validation at add-to-cart): audit confirms `CartStore` localStorage-only, `partialize({cart})`, `hydrated` gate, vendor grouping selectors, duplicate merge, cap at `maxStock`. Plan correctly says "lightweight stock read at add-to-cart purely informational, not requiring server cart" — compatible. Plan §21 correctly defers server-side/cart sync unless business need confirmed.
- CONFLICT: None.

### 2.5 Payments / Vendor Economics
- Plan §11 / §19-Q3 payment provider: audit confirms mock provider, `authorize()` + `recordCapture()` inside transaction, no webhook, no real processor. Plan correctly recommends Stripe Connect destination charge (fits current central-funds design) with prerequisite: business decision on commission model + country scope. Not unsupported.
- Plan §9 vendor experience (payouts / commissions): audit confirms no payout/commission/ledger exists; plan correctly says "needs payment provider + commission decision first."
- Plan §22 architecture / DB / API / background jobs (§25): all proposed additions (webhook worker, payout worker, notification worker, embedding worker) correctly note prerequisites (provider decision, Redis verified, embeddings ready).
- CONFLICT: None.
- DUPLICATE: None.
- UNSUPPORTED: None.

### 2.6 AI / Discovery / Recommendation / Assistant
- Plan §15 AI features (assistant, recommendations, enrichment, fraud, review summarization): all correctly tied to prerequisites:
  - Assistant/recommendations need `pgvector` + description/images + embeddings (§15, §23 `product_embeddings`).
  - Fraud scoring deferred (§21, §13).
  - Review summarization deferred until reviews exist (§8, §21).
  - Seller/catalog enrichment deferred until vendor self-service exists (§9).
- Plan correctly removes "AI for sake of AI" (fraud scoring deferred; forecasting deferred; review summarization deferred). No unsupported AI recommendations remain.
- CONFLICT: None.
- DUPLICATE: None. (AI assistant and recommendations share `pgvector` — correctly noted as shared infra, not duplicate work.)

### 2.7 Redis / BullMQ / Async / Workers
- Plan §14 / §25 / §16 / §27: audit confirms BullMQ configured (`BullModule`, `getBullMQConnectionOptions`, `vendor-worker-registry`, `vendor-queue`) but Redis not started, no runtime verification, checkout/orders do NOT depend on Redis. Plan correctly recommends: verify existing vendor-sync path first before building more workers; keep checkout isolated from queue health; add webhook/payout/notification/embedding workers only after verification.
- Plan does NOT propose adding Redis dependencies to checkout/orders — correct.
- CONFLICT: None.

### 2.8 Testing / Reliability / DevOps
- Plan §26 testing strategy (unit / integration / API / DB / E2E / concurrency / auth / vendor / admin / queues / failure): audit confirms only catalog regression spec (`catalog.mapping.spec.ts`) exists; manual verification for auth/orders/checkout; no automated E2E; no concurrency test; no queue/worker tests. Plan's test requirements correctly address the gaps without claiming existing coverage.
- Plan §27 failure scenarios / §16 production engineering / §28 dependency graph: all consistent with audit (idempotency, concurrency, webhook dup, worker failure, DB failure all documented; isolation of checkout from Redis preserved).
- Plan §20 devops (Docker, CI, env, build): audit verifies `.env` untracked, `synchronize: false`, migrations source of truth, Cloud DB `ssl` config; plan references but does not alter.
- CONFLICT: None.

### 2.9 Multi-Vendor / Vendor Platform / Order Splitting
- Plan §9 vendor gaps / §12 fulfillment / §19-Q1/Q2 / DB `order_groups`: audit confirms vendor entity/service/controller, `vendor_mock`, `vendor_sync_job`, `vendorId` on line items, `GET /vendor/:vendorId`, but no verified multi-vendor checkout, no vendor auth depth, no payout/commission, no vendor dashboard, no order split logic. Plan correctly sequences: confirm multi-vendor checkout behavior (audit Q1) → order splitting (if needed) → vendor auth → payouts. No unsupported claim that multi-vendor is fully working.
- CONFLICT: None.

### 2.10 Admin / Operations / Trust / Refund / Dispute
- Plan §10 admin / §27 failure / §23 DB / §24 API (`POST /orders/:id/refund`): audit confirms basic admin/controller/service/page; audit logging; no refund/commission/reconciliation shown; `CANCEL` transition allowed but empty action. Plan correctly says admin console is "advanced-only," depends on payment provider + vendor auth, and proposes refund as idempotent/auditable — not claiming current refund flow exists.
- CONFLICT: None.

## 3. DISCREPANCY REPORT (clear, no silent corrections)

| # | Topic | Plan Claim / Recommendation | Audit Evidence | Discrepancy | Severity | Resolution Required |
|---|---|---|---|---|---|---|
| D1 | Product description/images | Plan §8: "most visible gap, cheap to close." | Audit: migration exists (1710000000007); entity excludes; service/DTO exclude; customer-facing product detail empty. | **None — consistent.** Plan correctly references audit Q2. | — | Decide mapping direction (plan §18-Q2) before implementation |
| D2 | Checkout idempotency | Plan §16/§18-Q1: recommend option (a) client key + server check. | Audit: no key exists; transaction + unique sequence provide partial protection only; code read shows no dedup. | **None — consistent.** Plan correctly identifies missing feature. | — | Confirm business requirement (window) before implementing |
| D3 | Payment provider | Plan §11/§19-Q3: Stripe Connect destination charge recommended; requires business decision. | Audit: mock only; `authorize()`/`recordCapture()` interface exists; no webhook; no real processor. | **None — consistent.** Plan explicitly says decision required; does not claim provider selected. | — | Confirm commission model + countries + provider contract |
| D4 | Vendor auth depth | Plan §9/§19-Q4: extend JWT with vendor role; external KYC only if self-onboarding opens. | Audit: mock/partial; controllers/services exist; full flow not deep-audited; `RequireRole` exists. | **None — consistent.** Plan matches audit's "partial" classification. | — | Confirm vendor onboarding model (admin vs self-service) |
| D5 | Multi-vendor order split | Plan §12/§19-Q1: incremental; needs confirmation of current checkout behavior first. | Audit: `order_line_items.vendorId`; single `orders` write in checkout; no splitting logic shown. | **None — consistent.** Plan does not claim splitting works; asks audit Q1 first. | — | Confirm whether single checkout can span vendors |
| D6 | AI assistant / recommendations | Plan §15: needs description/images + embeddings; advanced only after data. | Audit: no embeddings, no description/images, 25 products, unclear order volume. | **None — consistent.** Plan correctly defers until prerequisites met. | — | Confirm scope (MVP = name/category similarity only?) |
| D7 | Search engine migration | Plan §14/§21: not recommended yet; revisit at low-thousands SKUs. | Audit: Postgres QueryBuilder works; autocomplete possibly unbounded; 25 products. | **None — consistent.** Plan explicitly defers. | — | Measure autocomplete latency / query volume before deciding |
| D8 | Server-side/cart sync | Plan §8/§21: not recommended without confirmed business need; current tradeoff sufficient. | Audit: `CartStore` localStorage; `hydrated`; vendor grouping; cap by `maxStock`. | **None — consistent.** Plan validates audit's documented tradeoff. | — | Confirm if cross-device loss reported |
| D9 | Fraud/ML scoring | Plan §13/§21: defer until real payments + volume justify; rule-based sufficient now. | Audit: mock payments only; 5 vendors; no fraud signals; no transaction volume. | **None — consistent.** Plan explicitly defers. | — | Confirm when real payments + volume threshold met |
| D10 | Reviews / ratings | Plan §8/§21: needs description/images first; basic MVP if needed; summarization deferred. | Audit: `/wishlist` exists; backend for reviews not shown; `reviews` table not in entities. | **None — consistent.** Plan does not claim reviews exist; proposes after product data lands. | — | Confirm if reviews are business requirement |
| D11 | Redis / BullMQ workers | Plan §25: verify existing path first; add only specific workers (webhook/payout/notification/embedding). | Audit: configured but not started; checkout/orders isolated; no runtime verification. | **None — consistent.** Plan preserves isolation; does not build checkout on unverified queue. | — | Start/verify vendor-sync in real env; then decide new workers |
| D12 | Testing / E2E | Plan §26: integration first, E2E second; concurrency test for pessimistic_write. | Audit: one regression spec (`catalog.mapping.spec.ts`); manual verification; no automated checkout/integration/E2E/concurrency tests. | **None — consistent.** Plan addresses all gaps without claiming existing coverage. | — | Choose test framework; write integration first (protects money path) |
| D13 | Security / webhook verification | Plan §24 (`POST /webhooks/payments`): needs signature verification; provider event ID dedup. | Audit: no webhooks exist; no webhook module; `audit-service` exists; `ThrottlerModule` exists. | **None — consistent.** Plan proposes new module with verification; does not assume existing. | — | Confirm provider; set webhook secret; design dedup |
| D14 | Admin refund / dispute / vendor mgmt | Plan §10/§24: advanced-only; depends on payment provider + vendor auth. | Audit: basic admin exists; `CANCEL` transition empty; no refund/commission/reconciliation shown. | **None — consistent.** Plan correctly sequences after payments + vendor auth. | — | Confirm admin requirements |

**Result:** 14 documented cross-checks — 0 conflicts, 0 unsupported claims, 0 hidden duplicates, 0 fabricated completions. Plan is fully grounded in audit; recommendations are sequence-correct; prerequisites correctly identified; deferred features correctly justified.

## 4. ARCHITECTURE COMPATIBILITY (verified per plan section)
- **Frontend (Next.js App Router):** plan proposes rendering description/images on product detail (existing page); vendor routes only after auth confirmed (existing route groups `(storefront)` / `(operational)`); no structural change needed (§22). Compatible.
- **Backend (NestJS / TypeORM):** plan proposes extending `orders.service` (idempotency lookup at transaction start); `payments.service` abstraction layer (existing interface `authorize()`/`recordCapture()` — good seam); new modules (`payments-webhook.worker`, `notifications.worker`) — additive; no existing module conflict (§22).
- **Database (PostgreSQL / Supabase / TypeORM):** all proposed entities additive (`product_embeddings` with pgvector, `checkout_idempotency_keys`, `vendor_accounts`, `payouts`, `commission_rules`, `order_groups`, `reviews`). Existing entities unchanged. `synchronize: false` preserved (§23, §22). Migration order: phase 0 (description/images + idempotency + tests + Redis verify) before phase 2 (payments/vendor DB) — correct (§28 graph).
- **Infrastructure (Docker / CI / env):** plan references but does not alter `docker-compose.yml`, `.env.example`, CI workflow; Redis verification required before new workers (§16, §27); no deployment conflict (§22).
- **Payments (checkout / authorization / capture):** plan respects existing transaction design (authorize before stock, capture after order write); proposes provider behind existing interface; webhook dedup required; no assumption of automatic capture from current mock (§11, §24).
- **Auth (JWT / refresh / roles):** plan proposes vendor role extension (reuse module); external KYC only if self-onboarding; no breaking change to buyer auth (§9, §18-Q4).
- **Catalog / Search / AI:** plan proposes `pgvector` extension on existing Supabase (no new DB); search engine deferred; AI features share embedding infrastructure (§14, §15, §22). Compatible.
- **Orders / Transactions:** plan preserves `dataSource.transaction`, `pessimistic_write`, audit logging, `order_number_seq`; only adds idempotency lookup at entry (§16, §27, §28). No architectural break.

## 5. DEPENDENCY GRAPH VALIDATION (plan §28 — verified against audit)
```
FOUNDATION / HARDENING (all independent — correct)
  - map description/images (independent)
  - checkout idempotency (independent)
  - integration tests (independent, protects all below)
  - verify Redis/BullMQ (gates async work — correct)
        |
        v
CORE MARKETPLACE COMPLETION (depends on Phase 0 — correct)
  - multi-vendor confirmation (needs audit Q1 first — correct)
  - reviews (needs description/images — correct per §8)
  - notifications scoping (needs audit follow-up — correct per §20)
        |
        v
PAYMENTS / VENDOR PLATFORM (coupled — correct per §11, §9, §19-Q3/Q4)
  - payment provider decision (business gate — correct)
  - vendor auth (internal role first — correct)
        |
        v
  - payouts / commission (needs provider + model — correct)
  - order splitting (needs confirmed behavior + vendor — correct)
        |
        v
OPERATIONS / TRUST (needs phase 2 — correct)
  - admin refund/dispute (needs provider refund API — correct)
  - vendor mgmt (needs vendor auth — correct)
  - fraud (only if volume + payments — correct per §13, §21)
        |
        v
ADVANCED DISCOVERY / AI (needs phase 0/1 + embeddings — correct)
  - pgvector (shared infra — correct)
  - AI assistant (needs complete product data — correct)
  - recommendations (needs embeddings + volume — correct)
        |
        v
SCALE (triggered, not calendar — correct)
```
**Validation:** graph is technically sound; no reverse dependencies; no missing prerequisites for any phase; Phase 0 correctly independent; Phase 2 correctly gated by business decisions (not engineering inference).

## 6. DATABASE IMPACT SUMMARY (plan §23 — validated against audit entities)
- **Additive only; no deletion of existing tables/columns; `synchronize: false` preserved.**
- `Product.description` / `Product.images`: maps migration 1710000000007; entity update; DTO update. Risk: low; decision needed on single vs gallery, text vs rich.
- `checkout_idempotency_keys` (or `orders.idempotency_key`): additive; needs TTL/cleanup. Low risk.
- `vendor_accounts`: new table; FK to `vendors`; sensitive (Stripe account refs); encrypt/restrict. Medium risk (financial data).
- `payouts` / `settlements`: new append-only ledger; FK `vendors`, `orders`. Medium risk (audit trail — must be immutable).
- `commission_rules`: new; FK `vendors`; depends on business model decision.
- `order_groups`: new parent; 1-to-many with `orders`; only if multi-vendor checkout confirmed.
- `reviews`: new; FK `products` + `users` + `orders` (verified-purchase gating); depends on description/images.
- `product_embeddings`: `pgvector` column or side table; re-embed on change; depends on `pgvector` extension (available in Supabase).

**Conflict check:** none with existing `products`, `vendors`, `orders`, `order_line_items`, `users`, `refresh_tokens`, `payment_authorizations`, `vendor_sync_jobs`, `audit_logs`. All relations compatible (existing FKs preserved).

## 7. API / SECURITY / PAYMENT SAFETY SUMMARY
- `POST /checkout` extension (§24): idempotency key required; dedup before transaction; same auth (JWT); same transaction boundaries; no new side effects beyond existing; safe.
- `POST /webhooks/payments`: new module; requires webhook signature verification + event-ID dedup (§27); must not affect checkout isolation (§27: preserve checkout independence from queue health); safe if designed correctly.
- `GET/PUT /vendor/products`: new; vendor-scoped JWT; depends on vendor auth confirmation (§9); authorization must enforce vendor isolation (prevent vendor A seeing vendor B's products) — audit notes deep authorization not audited; must be addressed.
- `POST /orders/:id/refund`: new admin endpoint; depends on provider refund API; idempotent per request; audit log required (£27: audit trail for financial events already exists — extend). Safe.
- `POST /assistant/query`: read-only; anonymous allowed; no side effects; grounding required (§15: hallucination risk); safe.
- Security prerequisites before advanced features (§10, §27, §17): confirm DB rotation (external); verify CORS; confirm refresh-token revocation; deepen admin/vendor authorization audit. Plan correctly identifies these as prerequisites, not afterthoughts.

## 8. TESTING / CONCURRENCY / FAILURE SCENARIOS
- Integration test (§26): `orders.service.checkout()` against real/test Postgres — verifies transaction, sorted locks, rollback, order write, audit log. Directly protects highest-risk path. Plan correct.
- Concurrency test (§26): simultaneous requests for same low-stock product — verifies `pessimistic_write` holds. Audit explicitly did not perform against production; remains open. Plan correctly addresses.
- Webhook / queue failure (§27): provider event-ID dedup; DLQ; retry; alerting. Plan correctly separates payment webhook processing from checkout (queue failure must not break checkout).
- Redis failure (§27): must not affect checkout/orders. Plan preserves this (§27, §28, §22).
- Payment timeout (§27): define timeout + retry/backoff once real provider network calls in place. Plan notes — not inventing behavior for mock.

## 9. AI VALIDATION (plan §15 — fully validated)
- Assistant: problem real (vague intent); data required (complete catalog + embeddings); prerequisites identified (description/images first, then embeddings, then LLM API); failure modes documented (hallucination, stale price); MVP scoped (name/category similarity only); advanced deferred. Not "AI for sake of AI."
- Recommendations: needs embeddings + purchase history; low signal at 25 products / limited orders; correctly deferred until volume justifies (§15, §21).
- Catalog enrichment: only if vendor self-service opens; human review required; safe.
- Fraud/scoring: correctly deferred (§21, §13); rule-based sufficient now.
- Review summarization: deferred until reviews exist + volume (§21).
- **Result:** no unsupported AI recommendations; all tied to prerequisites; all failure modes documented.

## 10. MULTI-VENDOR MARKETPLACE VALIDATION (§7) — critical
- Schema supports multi-vendor line items (`vendorId` on `order_line_items`, `vendor` relation on `Product`).
- Checkout writes single `orders` row; no `order_group` parent; no splitting logic.
- Plan correctly does NOT claim multi-vendor checkout is fully working; asks audit Q1 (§19) first; proposes incremental split only after confirmation (§12, §28).
- Vendor payout/commission not implemented; plan sequences after payment provider + vendor auth (§9, §11).
- **Conclusion:** architecture supports multi-vendor eventual; currently single-order; plan correctly treats splitting as incremental, not redesign.

## 11. REDIS / BULLMQ VALIDATION (§8, §14, §25, §27)
- Existing: vendor-sync queue + worker registry; BullMQ configured; Redis not started; checkout/orders isolated.
- Plan recommendations for new workers (webhook, payout, notification, embedding) all include prerequisites (provider decision, Redis verified, embeddings ready) and note isolation preservation.
- No proposal to move checkout/orders onto Redis; correct.
- **Result:** validated; no unnecessary queue introduction.

## 12. DEFERRED / NOT RECOMMENDED (plan §21 — validated against audit)
- Search migration: audit confirms adequate at 25 SKUs; plan defers; correct.
- Fraud ML: audit confirms no real payments/volume; plan defers; correct.
- KYC pipeline: 5 manually-vetted vendors; plan defers; correct.
- Escrow: catalog not high-value/service-window; plan defers; correct.
- Server-side/cart sync: audit documents as sufficient tradeoff; plan defers; correct.
- Review summarization / AI support agent: depends on reviews (missing) + volume; plan defers; correct.
- Demand forecasting: needs order volume; plan defers; correct.
- Payout automation multi-currency: needs commission + country scope decisions; plan defers; correct.
- **No feature incorrectly deferred or incorrectly recommended.**

## 13. FINAL IMPLEMENTATION ORDER (derived from plan §28 + validation)
1. **Foundation / Hardening (Phase 0)** — all independent; protect existing checkout; close audit gaps.
   - 1a. Confirm DB password rotation (external, must complete).
   - 1b. Decide description/images mapping direction (§18-Q2).
   - 1c. Add checkout idempotency key (§18-Q1; confirm window).
   - 1d. Write integration/concurrency tests (§26; protects money path).
   - 1e. Start / verify existing Redis/BullMQ vendor-sync in real env (§16).
2. **Core Marketplace Completion (Phase 1)** — depends on Phase 0.
   - 2a. Map and render description/images (§8).
   - 2b. Confirm multi-vendor-single-checkout behavior (§19-Q1); if gap, implement split (§12).
   - 2c. Basic reviews (if business need; after 2a).
   - 2d. Notifications scoping (§20 — confirm backend state first).
3. **Payments / Vendor Platform (Phase 2)** — business decisions required first (§19-Q3/Q4; §11).
   - 3a. Confirm payment provider + commission model + country scope (§19-Q3).
   - 3b. Confirm vendor onboarding model (§19-Q4).
   - 3c. Implement provider behind `payments.service` interface + webhook consumer (§24).
   - 3d. Vendor auth (internal JWT role first; external KYC only if self-service opens) (§9).
   - 3e. Vendor product/inventory self-service (§9).
   - 3f. Payouts / commission ledger (after 3a/3b/3c) (§11, §23).
4. **Operations / Trust (Phase 3)** — depends on Phase 2.
   - 4a. Admin refund/dispute console (§10; needs provider refund API).
   - 4b. Vendor management / approval (§10).
   - 4c. Rule-based fraud checks (§13; after real payments live).
5. **Advanced Discovery / AI (Phase 4)** — depends on Phase 0/1 + embeddings (§15, §23).
   - 5a. Enable `pgvector`; generate embeddings (§23).
   - 5b. AI shopping assistant MVP (§15; after 2a + 5a).
   - 5c. Similar-product recommendations (§15; after 5a + enough volume).
6. **Scale (Phase 5)** — triggered by measured metrics (§19-Q8, §14, §13, §11).
   - 6a. Search engine migration (only if catalog/query volume justifies).
   - 6b. KYC pipeline (if vendor self-onboarding opens).
   - 6c. ML fraud (if volume + payments justify).
   - 6d. Demand forecasting (if order history sufficient).

## 14. BACKLOG ENTRIES (condensed — sufficient for sequential implementation)
| ID | Feature | State | Dependencies | Key Work | Acceptance |
|---|---|---|---|---|---|
| F1 | Product description/images | Migration exists; unmapped | Q2 decision | Entity/DTO/service/API; frontend render; decide single/gallery, text/rich | Product detail shows content; mapping correct |
| F2 | Checkout idempotency | Missing | Q1 confirmation | DB column/table; `checkout()` lookup before transaction; TTL/cleanup | Duplicate request produces same order; no double inventory decrement |
| F3 | Integration + concurrency tests | Only catalog reg exists | None (protects F2/F4/F5) | `orders.service` integration; concurrency test (low-stock simultaneous) | Test passes; deadlock prevented; rollback verified |
| F4 | Redis/BullMQ verification | Configured; not started | None (gates F6/F7/F8/F9) | Start vendor-sync in real env; verify worker + retry + DLQ | Queue workers process jobs; failure handled; checkout unaffected |
| F5 | DB credential rotation | External action | None | Confirm externally; update `.env`; verify connection | No exposed credentials; connection stable |
| F6 | Payment provider integration | Mock only | Q3 decision + F4 | `payments.service` abstraction; webhook consumer; webhook verification | Real authorization + capture; webhook verified; no double charge |
| F7 | Vendor auth (internal) | Mock/partial | Q4 confirmation | JWT role/scope; `RequireRole` depth; authorization on vendor routes | Vendor can access only own products/orders |
| F8 | Vendor self-service product/inventory | Not shown | F7 | Vendor-crud controller/service; DTO; stock updates | Vendor updates own listings; inventory correct |
| F9 | Vendor payouts / commission | Not implemented | F6 + Q3 (commission model) + F7 | `vendor_accounts`; `payouts`; `commission_rules`; payout worker | Vendor receives correct amount; ledger immutable |
| F10 | Multi-vendor order splitting | Unclear | Q1 + F7 (if needed) | Confirm checkout behavior; implement `order_groups` if needed | Multi-vendor cart splits correctly; fulfillment independent |
| F11 | Reviews | Not present | F1 (after) | `reviews` table; capture + display; verified-purchase gate | Reviews display; no fake data |
| F12 | Notifications scoping | Unverified | F4 + Q20 | Confirm `/notifications` backend state; design BullMQ-driven if needed | Notifications functional |
| F13 | Admin refund/dispute | Basic only | F6 | Refund endpoint; audit; provider API integration | Refund idempotent; audit complete |
| F14 | AI assistant MVP | Not present | F1 + embeddings | `pgvector`; embedding generation; LLM API; grounding | Assistant returns cited results; no hallucination |

## 15. OPEN DECISIONS (must be made by business/product — not engineering inference)
- Q2: Description/images — single vs gallery, plain vs rich text? (Blocks F1, F11, F14, F7 if vendor-submitted.)
- Q3: Payment provider — Stripe Connect destination vs direct? Commission model (flat %, tiered, subscription)? Countries/currencies? (Blocks F6, F9, F13.)
- Q4: Vendor onboarding — admin-mediated indefinitely, or self-service near-term? (Blocks F7, F8, F10, F5's vendor auth depth.)
- Q1: Multi-vendor single-checkout — confirmed or not? (Blocks F10.)
- Q7: Catalog size / query volume triggers for search/AI — measured target? (Blocks F14, Phase 5.)
- DB rotation: externally confirmed complete? (Prerequisite for all; already documented; not changed here.)

## 16. FINAL STATUS — VALIDATED; NO IMPLEMENTATION
- AUDIT: complete (30 sections, evidence from actual repo + DB + code read + DB connection verified — Supabase `aws-0-ap-south-1.pooler.supabase.com:6543`, 25 products, 5 vendors, 9 migrations, entities, controllers, services, frontend pages, CartStore, auth-context, API client).
- CROSS-DOCUMENT VALIDATION: complete (plan grounded in audit; 0 conflicts; 0 unsupported claims; 0 hidden duplicates; 0 fabricated completions; dependency graph verified; all deferred features correctly justified; multi-vendor validated; Redis validated; AI validated; security prerequisites identified).
- CODE CHANGED: none (audit rule §27 preserved; report only; `AUDIT_REPORT.md` + `MARKETPLACE_PRODUCT_RESEARCH_AND_IMPLEMENTATION_PLAN_FINAL.md` written; no migrations; no entity edits; no service edits; `.env` not changed; DB not modified; no mock products; no fabricated orders).
- NEXT STEP (per instructions): move to Claude Code for sequential implementation only after business decisions (Q1–Q4, DB rotation confirm) are made and Phase 0 is approved.
Co-Authored-By: Claude Code <noreply@anthropic.com>
🤖 Generated with [Claude Code](https://claude.com/claude-code)
