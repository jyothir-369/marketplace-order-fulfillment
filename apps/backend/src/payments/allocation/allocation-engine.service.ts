import { CommissionPolicy, validatePolicy, PolicyValidationError } from './commission-policy.interface';
import { DiscountFundingPolicy, validateDiscountFundingPolicy } from './discount-funding.interface';

export interface AllocationInput {
  orderReference: string;
  vendorId: string;
  lineTotalPaise: number; // gross line total in minor units (positive integer)
  capturedAmountPaise?: number; // authoritative captured payment amount for reconciliation
  currency: string;
  rulesVersion: string;
  vendorAccountState?: string; // e.g., ACTIVE / PENDING / SUSPENDED (Phase 2)
  linkedAccountStatus?: string; // Phase 2 eligibility guard
}

export interface AllocationBreakdown {
  grossLinePaise: number;
  discountPaise?: number;
  taxPaise?: number;
  shippingPaise?: number;
  commissionPaise: number;
  feePaise: number;
  vendorPayablePaise: number;
  platformNetPaise: number;
}

export interface AllocationResult {
  orderReference: string;
  vendorId: string;
  currency: string;
  rulesVersion: string;
  grossLinePaise: number;
  breakdown: AllocationBreakdown;
  allocationPaise: number; // vendorPayablePaise
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

function toPaise(value: number): number {
  const rounded = Math.round(Number(value) * 100);
  if (!Number.isFinite(rounded)) throw new AllocationCalculationError('overflow', `Non-finite value: ${value}`);
  if (rounded < 0) throw new AllocationCalculationError('negative', `Negative value not allowed: ${value}`);
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
  if (input.lineTotalPaise === undefined || input.lineTotalPaise === null) {
    throw new AllocationCalculationError('missing_input', 'lineTotalPaise required');
  }
  if (!Number.isInteger(Number(input.lineTotalPaise)) || input.lineTotalPaise < 0) {
    throw new AllocationCalculationError('invalid_line_total', `lineTotalPaise must be non-negative integer; got ${input.lineTotalPaise}`);
  }

  const gross = input.lineTotalPaise;

  // Commission arithmetic in integer minor units.
  let commissionPaise = 0;
  if (p.model === 'PERCENTAGE') {
    // rate expressed as basis points (e.g., 1500 = 15.00%) for deterministic integer arithmetic
    commissionPaise = Math.round((gross * (p.rate || 0)) / 10000);
  } else if (p.model === 'FIXED_AMOUNT') {
    commissionPaise = Math.round(p.rate || 0);
  } else {
    // CATEGORY_SPECIFIC requires per-category rate; treat as missing policy until configured.
    throw new AllocationCalculationError('unsupported_policy', `CATEGORY_SPECIFIC requires additional per-category rules (config contract not met)`);
  }

  if (commissionPaise < 0) commissionPaise = 0;
  if (commissionPaise > gross) commissionPaise = gross; // guard against over-commission

  const feePaise = p.feePaise ?? 0;
  const fundingPolicy: DiscountFundingPolicy = validateDiscountFundingPolicy(undefined, input.rulesVersion);
  const discountPaise = Math.max(0, (fundingPolicy.discountTreatment === 'VENDOR_FUNDED' && fundingPolicy.vendorDiscountRatePercent ? gross * fundingPolicy.vendorDiscountRatePercent / 100 : 0)); // vendor-funded % applied to gross; marketplace-funded = 0 funded to vendor
  const taxPaise = 0; // kept at 0 until tax/shipping rules defined; not invented.

  // Vendor payable = gross - discount (funded per policy) - commission - fees; exact paise reconciliation.
  const vendorPayablePaise = Math.max(0, gross - discountPaise - commissionPaise - feePaise);
  const platformNetPaise = gross - vendorPayablePaise - feePaise; // should approximate commission

  const breakdown: AllocationBreakdown = {
    grossLinePaise: gross,
    discountPaise,
    taxPaise,
    shippingPaise: 0,
    commissionPaise,
    feePaise,
    vendorPayablePaise,
    platformNetPaise,
  };

  // Reconciliation against captured amount when available.
  let reconciliationStatus: AllocationResult['reconciliationStatus'] = 'RECONCILED';
  if (input.capturedAmountPaise !== undefined && input.capturedAmountPaise !== null) {
    if (!Number.isInteger(Number(input.capturedAmountPaise))) {
      throw new AllocationCalculationError('invalid_capture_amount', `capturedAmountPaise must be integer; got ${input.capturedAmountPaise}`);
    }
    if (input.capturedAmountPaise < 0) {
      throw new AllocationCalculationError('negative_capture_amount', `capturedAmountPaise < 0: ${input.capturedAmountPaise}`);
    }
    // For line-level reconciliation: line gross equals captured when order capture equals line total.
    reconciliationStatus = (input.capturedAmountPaise === gross) ? 'RECONCILED' : 'AMOUNT_MISMATCH';
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
    grossLinePaise: gross,
    breakdown,
    allocationPaise: vendorPayablePaise,
    reconciliationStatus,
    snapshot,
    idempotencyKey,
  };
}
