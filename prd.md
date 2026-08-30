



PRD 2 — Marketplace Order & Fulfillment System
1. Overview
A multi-vendor marketplace backend where buyers place orders against a shared catalog, inventory
decrements correctly under concurrent checkout load, and fulfillment status stays in sync with
(simulated) vendor systems.
2. Problem Statement
Marketplace checkout is a classic concurrency correctness problem: without careful design, concurrent
buyers can oversell limited stock, and vendor-side fulfillment updates can arrive out of order or get lost.
This project proves the concurrency and reconciliation logic actually works, not just that it compiles.
3. Goals
Guarantee inventory never goes negative under concurrent checkout load.
Keep order state and vendor fulfillment state reconciled even when vendor sync calls fail or complete late.
Demonstrate an expand-and-contract migration executed mid-project without downtime.
4. Non-Goals
Real payment processing (reuse a stub/mock payment step; focus is on inventory/fulfillment correctness).
Vendor onboarding UI (vendors and their inventory can be seeded via fixtures/admin script).
Recommendation/search ranking.
5. Users & Personas
Needs
Persona
Buyer
Browse catalog, check out, track order/fulfillment status
Vendor (simulated)Inventory and fulfillment updates arrive via a mock external API
Platform admin
Investigate and manually resolve fulfillment discrepancies
6. Functional Requirements
6.1 Catalog & Inventory
FR1: Products belong to a vendor and have a stock count.
FR2: Inventory decrements only occur inside a transaction that also creates the order line item.
FR3: Two concurrent checkouts for the last unit of stock must result in exactly one success and one clear
failure — never both succeeding.
6.2 Checkout & Orders
FR4: An order is created with line items across potentially multiple vendors.
FR5: Order has a lifecycle: 
placed → confirmed → fulfilling → fulfilled | cancelled 
.
FR6: Checkout is a single atomic operation from the buyer's perspective even though it spans multiple
vendor line items.
6.3 Vendor Fulfillment Sync
FR7: A background job calls a (simulated) vendor API per order line item to request fulfillment.
FR8: Vendor sync calls have bounded retries with backoff; permanently failed line items land in a dead
letter state visible to admins.
FR9: A reconciliation job periodically re-checks "in-flight" vendor calls whose result is ambiguous (timeout
without confirmed response) and resolves them (§7.5 — do not assume a timeout means failure).
6.4 Admin
FR10: Admin view lists orders with reconciliation status and allows manual resolution of stuck/ambiguous
fulfillment states.
7. Non-Functional Requirements
Category
Requirement
Correctness Zero overselling under load test with concurrent checkout simulation
Reliability
Auditability
Vendor sync worker uses bounded concurrency; one slow vendor cannot starve others
Every inventory decrement and fulfillment state change is logged with correlation ID
Category
Requirement
Migration
safety
Order-state model change executed via expand-and-contract with zero downtime,
demonstrated and documented
Observability Trace correlates checkout → inventory decrement → vendor sync → fulfillment
confirmation
8. Data Model (core entities)
vendors
 (id, name)
products
 (id, vendor_id, name, stock_count)
orders
 (id, buyer_id, status)
order_line_items
 (id, order_id, product_id, vendor_id, quantity, fulfillment_status)
vendor_sync_jobs
 (id, order_line_item_id, status, attempts, last_attempted_at)
9. Architecture Notes (per blueprint)
NestJS modules: 
catalog 
, 
orders 
, 
inventory 
, 
fulfillment 
, 
integrations/vendor-mock 
.
Inventory decrement + order-line creation wrapped in one PostgreSQL transaction with row-level locking
(
SELECT ... FOR UPDATE
) on the product row (§8.5).
Vendor sync implemented as a BullMQ worker with per-vendor concurrency limits (§9.4) and dead-letter
queue for exhausted retries.
Reconciliation job (scheduled, §9.5) resolves ambiguous in-flight vendor calls rather than assuming failure.
Order-state model migration executed mid-project using expand-and-contract (§8.3): add new status
column → dual-write → backfill → cut over reads → drop old column in a later release, with before/after
evidence of zero request errors.
10. API Surface (representative)
GET    /catalog
POST   /checkout                       
(atomic across vendor line items)
GET    /orders/:id
GET    /admin/orders?status=stuck
POST   /admin/orders/:id/resolve
11. Milestones
Walking skeleton: single-vendor catalog, checkout, no concurrency handling yet.
Concurrency-safe inventory decrement + load test proving no overselling.
Vendor sync worker with retries, dead-letter handling, and reconciliation job.
Admin console for stuck-order resolution.
Mid-project expand-and-contract migration on the order-state model, executed and documented live.
12. Success Metrics (for resume/portfolio)
0 overselling incidents across a load test of N concurrent checkouts against limited stock.
Vendor sync dead-letter rate and mean time-to-reconciliation reported from real job data.
Documented zero-downtime migration with before/after error-rate evidence.
13. Open Risks
Simulated vendor API needs deliberately injected failure modes (timeouts, slow responses, duplicate
confirmations) to make the reconciliation logic meaningfully testable.