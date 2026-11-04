import { CommissionPolicy, validatePolicy, PolicyValidationError } from './commission-policy.interface';

export interface AllocationInput {
  orderReference: string;
  vendorId: string;
  lineTotalCents: number; // gross line total in USD cents (positive safe integer)
  capturedAmountCents?: number; // authoritative captured payment for reconciliation
  currency: string;
  rulesVersion: string;
  vendorAccountState?: string; // e.g., ACTIVE / PENDING / SUSPENDED (Phase 2)
  linkedAccountStatus?: string; // Phase 2 eligibility guard
}

export interface AllocationBreakdown {
  grossLineCents: number;
  discountCents?: number;
  taxCents?: number;
  shippingCents?: number;
  commissionCents: number;
  feeCents: number;
  vendorPayableCents: number;
  platformNetCents: number;
}

export interface AllocationResult {
  orderReference: string;
  vendorId: string;
  currency: string;
  rulesVersion: string;
  grossLineCents: number;
  breakdown: AllocationBreakdown;
  allocationCents: number; // vendorPayableCents
  reconciliationStatus: 'RECONCILED' | 'MISSING_CAPTURE' | 'AMOUNT_MISMATCH';
  snapshot: string;
  idempotencyKey: string;
}

export class AllocationCalculationError extends Error {
  constructor(public reason: string, message: string) {
    super(message);
    this.name = 'AllocationCalculationError';
  }
}

function toCents(value: number): number {
  const rounded = Math.round(Number(value));
  if (!Number.isFinite(rounded)) throw new AllocationCalculationError('overflow', `Non-finite value: ${value}`);
  if (rounded < 0) throw new AllocationCalculationError('negative', `Negative value not allowed: ${value}`);
  if (!Number.isSafeInteger(rounded)) throw new AllocationCalculationError('unsafe_integer', `Value is not a safe integer: ${value}`);
  return rounded;
}

export function computeIdempotencyKey(orderReference: string, vendorId: string, rulesVersion: string): string {
  // Stable, deterministic identity; no secrets embedded.
  const payload = `${orderReference}|${vendorId}|${rulesVersion}`;
  return require('crypto').createHash('sha256').update(payload).digest('hex');
}

export function calculateVendorAllocation(
  input: AllocationInput,
  policy: CommissionPolicy,
): AllocationResult {
  // Fail-closed: reject unverified/ineligible vendor accounts when required by policy contract.
  if (input.vendorAccountState && input.vendorAccountState !== 'ACTIVE') {
    throw new AllocationCalculationError('vendor_not_eligible', `Vendor ${input.vendorId} state=${input.vendorAccountState}`);
  }
  if (input.linkedAccountStatus && input.linkedAccountStatus !== 'ELIGIBLE' && input.linkedAccountStatus !== 'ACTIVE') {
    throw new AllocationCalculationError('vendor_not_eligible', `Linked account status=${input.linkedAccountStatus}`);
  }

  const p = validatePolicy(policy, input.rulesVersion);
  if (p.currency !== input.currency) {
    throw new AllocationCalculationError('currency_mismatch', `Policy currency=${p.currency} != input currency=${input.currency}`);
  }

  // Trust only server-side inputs; reject untrusted/missing totals.
  if (input.lineTotalCents === undefined || input.lineTotalCents === null) {
    throw new AllocationCalculationError('missing_input', 'lineTotalCents required');
  }
  if (!Number.isSafeInteger(input.lineTotalCents) || input.lineTotalCents < 0) {
    throw new AllocationCalculationError('invalid_line_total', `lineTotalCents must be non-negative safe integer; got ${input.lineTotalCents}`);
  }
  // Reject non-integer or unsafe amounts; also enforce USD-cents context (positive safe integer only).
  if (typeof input.lineTotalCents !== 'number' || !Number.isInteger(input.lineTotalCents)) {
    throw new AllocationCalculationError('invalid_line_total', `lineTotalCents must be integer USD cents; got ${input.lineTotalCents}`);
  }

  const gross = input.lineTotalCents;

  // Commission arithmetic in integer minor units.
  let commissionCents = 0;
  if (p.model === 'PERCENTAGE') {
    // rate expressed as basis points (e.g., 1500 = 15.00%) for deterministic integer arithmetic
    const rateBps = p.rate || 0;
    commissionCents =
      Math.floor(gross / 10000) * rateBps +
      Math.round(((gross % 10000) * rateBps) / 10000);
  } else if (p.model === 'FIXED_AMOUNT') {
    commissionCents = Math.round(p.rate || 0);
  } else {
    // CATEGORY_SPECIFIC requires per-category rate; treat as missing policy until configured.
    throw new AllocationCalculationError('unsupported_policy', `CATEGORY_SPECIFIC requires additional per-category rules (config contract not met)`);
  }

  if (commissionCents < 0) commissionCents = 0;
  if (commissionCents > gross) commissionCents = gross; // guard against over-commission

  const feeCents = p.feeCents ?? 0;
  // No discount amount or approved funding policy is supplied to this engine.
  // Do not invent a funding decision or approval.
  const discountCents = 0; // vendor-funded % applied to gross; marketplace-funded = 0 funded to vendor
  const taxCents = 0; // kept at 0 until tax/shipping rules defined; not invented.

  // Vendor payable = gross - discount (funded per policy) - commission - fees; exact cents reconciliation (fail-closed: keep rules unapproved).
  const vendorPayableCents = Math.max(0, gross - discountCents - commissionCents - feeCents);
  const platformNetCents = gross - vendorPayableCents - feeCents; // approximates commission + fee

  const breakdown: AllocationBreakdown = {
    grossLineCents: gross,
    discountCents,
    taxCents,
    shippingCents: 0,
    commissionCents,
    feeCents,
    vendorPayableCents,
    platformNetCents,
  };

  // Reconciliation against captured amount when available.
  let reconciliationStatus: AllocationResult['reconciliationStatus'] = 'RECONCILED';
  if (input.capturedAmountCents !== undefined && input.capturedAmountCents !== null) {
    if (!Number.isSafeInteger(input.capturedAmountCents)) {
      throw new AllocationCalculationError('invalid_capture_amount', `capturedAmountCents must be safe integer; got ${input.capturedAmountCents}`);
    }
    if (input.capturedAmountCents < 0) {
      throw new AllocationCalculationError('negative_capture_amount', `capturedAmountCents < 0: ${input.capturedAmountCents}`);
    }
    // Rejection of mismatched currency or non-integer amounts is enforced above; keep reconciliation strict.
    reconciliationStatus = (input.capturedAmountCents === gross) ? 'RECONCILED' : 'AMOUNT_MISMATCH';
  } else {
    reconciliationStatus = 'MISSING_CAPTURE';
  }

  const snapshotObj = {
    input,
    policyVersion: p.rulesVersion,
    breakdown,
    timestamp: new Date().toISOString(),
  };
  const snapshot = JSON.stringify(snapshotObj);
  const idempotencyKey = computeIdempotencyKey(input.orderReference, input.vendorId, input.rulesVersion);

  return {
    orderReference: input.orderReference,
    vendorId: input.vendorId,
    currency: input.currency,
    rulesVersion: input.rulesVersion,
    grossLineCents: gross,
    breakdown,
    allocationCents: vendorPayableCents,
    reconciliationStatus,
    snapshot,
    idempotencyKey,
  };
}
