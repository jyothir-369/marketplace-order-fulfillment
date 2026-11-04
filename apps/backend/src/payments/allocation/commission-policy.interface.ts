import { assertUsdCurrency, assertUsdCents, ALLOCATION_CURRENCY } from '../money/usd-cents.contract';

export interface CommissionPolicy {
  rulesVersion: string;
  model: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'CATEGORY_SPECIFIC';
  rate?: number; // rate as USD-cents basis (percentage = basis points / 100 = percent; fixed = cents)
  feeBearer: 'PLATFORM' | 'VENDOR' | 'SHARED';
  feeCents?: number; // gateway/transfer fee in USD cents (integer)
  discountTreatment: 'BEFORE_COMMISSION' | 'AFTER_COMMISSION';
  taxShippingAllocation: 'GROSS' | 'NET';
  currency: 'USD'; // USD only per allocation contract
  activeFrom: Date;
  approved: boolean;
}

export class PolicyValidationError extends Error {
  constructor(public missingFields: string[], message: string) {
    super(message);
    this.name = 'PolicyValidationError';
  }
}

export function validatePolicy(policy: Partial<CommissionPolicy> | null | undefined, rulesVersion?: string): CommissionPolicy {
  if (!policy) {
    throw new PolicyValidationError(['policy'], 'Policy configuration is missing (FAIL CLOSED).');
  }
  const required: string[] = ['rulesVersion', 'model', 'feeBearer', 'currency', 'activeFrom', 'approved'];
  const missing = required.filter((r) => policy[r as keyof CommissionPolicy] === undefined || policy[r as keyof CommissionPolicy] === null);
  if (missing.length > 0) {
    throw new PolicyValidationError(missing, `Policy missing required fields: ${missing.join(', ')}`);
  }
  if (policy.approved !== true) {
    throw new PolicyValidationError(['approved'], 'Policy not approved (FAIL CLOSED).');
  }
  if (!['PERCENTAGE', 'FIXED_AMOUNT', 'CATEGORY_SPECIFIC'].includes(policy.model)) {
    throw new PolicyValidationError(['model'], `Unsupported commission model: ${policy.model}`);
  }
  if (policy.currency !== ALLOCATION_CURRENCY) {
    throw new PolicyValidationError(['currency'], `Policy currency must be USD per allocation contract; got ${policy.currency}`);
  }
  if (policy.model === 'PERCENTAGE' && (policy.rate === undefined || policy.rate === null || typeof policy.rate !== 'number' || policy.rate < 0 || policy.rate > 10000)) {
    throw new PolicyValidationError(['rate'], `PERCENTAGE model requires 0 <= rate <= 10000 (basis points); got ${policy.rate}`);
  }
  if (policy.model === 'FIXED_AMOUNT' && (policy.rate === undefined || policy.rate === null || typeof policy.rate !== 'number' || policy.rate < 0 || !Number.isSafeInteger(policy.rate))) {
    throw new PolicyValidationError(['rate'], `FIXED_AMOUNT model requires non-negative safe integer USD cents; got ${policy.rate}`);
  }
  if (policy.feeCents !== undefined && policy.feeCents !== null && (typeof policy.feeCents !== 'number' || policy.feeCents < 0 || !Number.isSafeInteger(policy.feeCents))) {
    throw new PolicyValidationError(['feeCents'], `feeCents must be non-negative safe integer USD cents; got ${policy.feeCents}`);
  }
  return policy as CommissionPolicy;
}
