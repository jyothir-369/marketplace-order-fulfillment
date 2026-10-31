/**
 * Vendor-split E2E contract scenario inventory.
 *
 * These scenarios are intentionally TODO until each has an executable,
 * evidence-backed test using the real application boundary and test doubles.
 * They are not represented as passing end-to-end payment tests.
 *
 * Live Razorpay transfers, refunds, and production database operations
 * must never be used to satisfy this test contract.
 */

describe('Vendor-split E2E contract scenarios', () => {
  it.todo('single-vendor successful checkout');
  it.todo('multi-vendor order with two successful transfers');
  it.todo('payment failure before capture');
  it.todo('captured payment with application response timeout');
  it.todo('duplicate payment verification is idempotent');
  it.todo('duplicate webhook event does not double-apply financial effects');
  it.todo('provider-accepted transfer with lost response requires safe recovery');
  it.todo('one vendor transfer succeeds while another fails');
  it.todo('refund before transfer follows the approved refund policy');
  it.todo('refund after transfer follows the approved reversal policy');
  it.todo('partial refund and partial reversal preserve amounts');
  it.todo('inactive or unapproved vendor account blocks transfer');
  it.todo('provider outage or rate limiting follows safe retry policy');
  it.todo('cancellation releases inventory without duplicating financial effects');
  it.todo('vendor cannot access another vendor financial records');
  it.todo('reconciliation detects a transfer amount mismatch');
});
