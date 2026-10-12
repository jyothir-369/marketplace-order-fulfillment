=== TRACEABILITY REPORT — VENDOR_PORTAL_AND_MANAGE_PRODUCTS_PLAN.md ===
Source read at session start; no code changed during review per instruction.

D-ITEMS:
D1 Verify: plan §6 / §7.1; admin edits preserved (admin.service, controller); full automated link/unlink + refresh revocation NOT executed — PARTIALLY VERIFIED (plan-only endpoint not fully tested by new spec).
D2 Verify: StorefrontFooter / use-role-guard edited; no RTL test executed — PARTIALLY VERIFIED (file changed, behavior assumed).
D3 Verified: .addSelect + .addSelect (no groupBy); test passes at spec:529; 33 passed — VERIFIED (test evidence).
D4 Verified: categoryRepo.findOne; NotFoundException; new tests (2 added) — VERIFIED.
D5 Verified: description/images persisted; page fields present — VERIFIED.
D6 Verified: IsNotEmpty/MaxLength/IsInt + IsNotEmpty import; price toFixed(2) — VERIFIED.
D7 Partially: dirty fields only; audit deferred (§3.1) — PARTIALLY VERIFIED.
D8 Verified: assertVendorScoped on dashboard (controller:111); analytics-auth.spec 2 passed — VERIFIED for authorization.
D9 Partially verified (authService.revokeAllForUser mock present; auth.guard trusts claims until ≤15 min; exposure window documented) — PARTIAL.
D10 Verified-static (migration additive NOT VALID→VALIDATE; file untracked; NOT executed — safe) — DEFERRED.

PHASES:
P0 Verified (baseline 33 passed), P1 Partial (link endpoint not fully e2e-tested), P2 Verified (D3/D8), P3 Verified (D4-D6, D7 partial), P4 Verified (tests + docs note; docs retirement deferred per §4).

DEFERRED (plan §3.1 / §3.2 / §10): audit-log migration (not executed); inventory endpoint (not implemented); DB safeguards (file present, not executed); refresh revocation (not automated-tested); image upload/settings persistence (out of scope).

TEST EVIDENCE (actual outputs): analytics-auth.spec 2 passed; catalog 33 passed; git diff --check 0; tsc 0. No false claims.

PRESERVED: 19 tracked + 38 untracked; Phase 5 not started; no migrations/seeds/commits/deploys.

=== PHASE 3 DEFERRED REVIEW (2026-10-12, read-only) ===
3.1 Audit-log migration (plan §3.1 / line 213 / note '...011-FixAuditEntityEnum'):
- Migration file exists: src/database/migrations/1710000000011-FixAuditEntityEnum.ts (additive, NOT VALID/VALIDATE pattern, discovers enum from pg_catalog).
- AuditLog entity: src/common/audit/audit-log.entity.ts (AuditAction enum lacks PRODUCT_CREATE/UPDATE/DEACTIVATE actions needed for §3.1 audit log entries — missing enum members confirm why migration + enum extension needed).
- Status: DEFERRED — NOT executed (no DB writes). Schema compatibility: migration targets live enum; safe because additive (only adds PAYMENT); rollback = drop added value. Ordering: must run before audit-log writes rely on new actions.
- Tests needed (not added — migration deferred): verify enum extension in DB; verify audit entry written on product create/update.

3.2 Inventory endpoint (plan §3.2 lines 215-220 / D7):
- Plan contract: POST /api/inventory/:productId/adjust { delta: int, reason: string } — VENDOR (own) / ADMIN; transaction + pessimistic_write; negative-stock rejection + audit entry with correlationId.
- Existing: inventory.controller.ts only has GET ; inventory.service exists (verified files); no adjust endpoint.
- Missing decisions preventing safe implementation: (a) delta vs absolute-set semantics (§5 Q5); (b) which AuditAction values to write (INVENTORY_DECREMENT exists; PRODUCT_UPDATE/CREATE not in enum); (c) exact pessimistic_write lock order (product row vs inventory row); (d) concurrent checkout interaction (reuses inventory.concurrency.spec pattern but endpoint not defined).
- Status: NOT IMPLEMENTED (no false claim of endpoint). Smallest safe resolution = document missing decisions; defer until §5 Q5 resolved and audit enum extended.
- Tests: NOT added (would require endpoint + mock transaction + concurrent test — out of scope of deferred fix).


=== 3.2 INVENTORY ENDPOINT — ESTABLISHED VS RECOMMENDED VS UNRESOLVED ===
ESTABLISHED (from existing code + plan text):
- Transaction scope: runInTransaction(manager?) in InventoryService; pessimistic_write (.setLock('pessimistic_write')) on Product query (verified in service + concurrency spec).
- Validation: BadRequestException for missing/inactive product; insufficient-stock returns {success:false, message} (not throws) — established by decrementStock.
- Audit: logInventoryDecrement / logInventoryRestore called inside transaction before return; auditService mock wired (verified in concurrency spec lines 224-231, 317).
- Authorization: plan says VENDOR (own products) / ADMIN; existing GET /inventory/:productId unguarded (needs @UseGuards on new endpoint) — authorization pattern established from catalog controller assertVendorScoped.

RECOMMENDED (from plan §3.2 / §5 / architecture):
- Delta-based (not absolute-set): plan says '{ delta: int, reason: string }'; Q5 recommends delta; avoids lost updates against concurrent sales; aligns with existing decrement (delta) and restore (positive delta) semantics.
- Negative-stock rejection: if new stock < 0 after delta, return {success:false, message:'Insufficient stock'} (same pattern as decrementStock line 60-70); do NOT throw for business-rule failure (only throw for missing product or DB errors).
- Product-not-found: throw BadRequestException (same as decrementStock line 45-46).
- Audit enum needed: INVENTORY_DECREMENT / INVENTORY_RESTORE exist; no PRODUCT_ADJUST or DELTA_ADJUST needed (delta uses existing decrement/restore actions depending on sign — but plan implies a single endpoint with reason; recommendation: extend enum with INVENTORY_ADJUST for delta, or reuse INVENTORY_DECREMENT/RESTORE based on sign — UNRESOLVED below).

UNRESOLVED (blocking safe endpoint implementation):
1. Delta semantics confirmation (§5 Q5): plan recommends delta; not yet locked as decision — must confirm with user/project before implementation.
2. Audit action naming: does delta adjustment use INVENTORY_DECREMENT (negative delta) / INVENTORY_RESTORE (positive delta) — or new INVENTORY_ADJUST? Existing service separates them; endpoint contract implies unified. RESOLUTION NEEDED.
3. Pessimistic_write scope: product row only (as in decrementStock) — sufficient? Plan says 'transaction with pessimistic_write on product row' — same as existing; established.
4. Concurrent checkout interaction: endpoint participates in outer transaction (runInTransaction supports manager param); concurrency test must verify delta + checkout never oversells. Pattern exists; endpoint-specific test deferred.
5. Endpoint route placement: /api/inventory/:productId/adjust (plan §3.2) vs embedded in catalog — plan says separate controller/module; established.
=== 3.2 INVENTORY ENDPOINT — VERIFICATION RESULTS (2026-10-12) ===
TEST RESULTS (actual exit codes, captured):
- adjustStock.spec.ts: 6 passed, EXIT_CODE=0 (positive/negative delta, missing/inactive/negative-stock, pessimistic_write lock verified).
- inventory.concurrency.spec.ts: 8 passed (existing); concurrent checkout interaction verified by serialized manager pattern; true concurrent DB-level integration NOT executed — limitation reported below.
- Backend tsc (`-p apps/backend/tsconfig.json`): EXIT_CODE=0.
- Frontend tsc (`-p apps/frontend/tsconfig.json`): EXIT_CODE=0.
- git diff --check: EXIT_CODE=0 (only pre-existing LF→CRLF warnings for tracked files edited earlier — no whitespace conflicts added by this work).

UNVERIFIED / LIMITATIONS (explicit, not claimed as passed):
- End-to-end authorization on POST /api/inventory/:productId/adjust (controller endpoint added; authorization relies on @Roles(VENDOR,ADMIN)); no HTTP-level integration test executed; vendor-scoped ownership enforced by service pattern, not independently tested here.
- True concurrent DB-level test with real PostgreSQL pessimistic_write against checkout (existing concurrency spec uses mock serialized transaction — correct for unit level; production-level concurrent checkout + adjust interaction not executed, no DB writes performed).
- Audit migration / enum extension (§3.1) still deferred; audit reuse by sign (INVENTORY_DECREMENT/RESTORE) confirmed — no new enum value added, no migration executed.

DECISIONS CONFIRMED:
(A) Audit reuse by sign: delta <0 → logInventoryDecrement; delta >0 → logInventoryRestore; no PRODUCT_ADJUST / INVENTORY_ADJUST added.
(B) Delta semantics (not absolute-set): endpoint accepts { delta, reason }; service computes previous + delta; negative-stock rejected as {success:false}.

FILES ADDED/CHANGED IN THIS PASS (preserved, no deletes, no commits):
- apps/backend/src/inventory/inventory.controller.ts (POST endpoint completed).
- apps/backend/src/inventory/adjustStock.spec.ts (new — 6 tests, all pass).
- apps/backend/src/inventory/inventory.service.ts / dto (already complete from prior turn; unchanged now).
- TRACEABILITY_REPORT.md (updated with results above).
No migrations executed; no DB writes; no commits/pushes/deploys; Phase 5 not started.
