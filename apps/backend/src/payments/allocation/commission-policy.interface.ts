export interface CommissionPolicy {
  rulesVersion: string;
  model: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'CATEGORY_SPECIFIC';
  rate?: number; // rate in minor units if PERCENTAGE; absolute paise if FIXED_AMOUNT
  feeBearer: 'PLATFORM' | 'VENDOR' | 'SHARED';
  feePaise?: number; // gateway/transfer fee in minor units
  discountTreatment: 'BEFORE_COMMISSION' | 'AFTER_COMMISSION';
  taxShippingAllocation: 'GROSS' | 'NET';
  currency: string; // e.g., 'INR'
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
  if (policy.currency !== 'INR') {
    throw new PolicyValidationError(['currency'], `Unsupported currency for this contract: ${policy.currency}`);
  }
  if (policy.model === 'PERCENTAGE' && (policy.rate === undefined || policy.rate === null || policy.rate < 0 || policy.rate > 10000)) {
    throw new PolicyValidationError(['rate'], `PERCENTAGE model requires 0 <= rate <= 10000 (paise-scale basis); got ${policy.rate}`);
  }
  if (policy.model === 'FIXED_AMOUNT' && (policy.rate === undefined || policy.rate === null || policy.rate < 0)) {
    throw new PolicyValidationError(['rate'], `FIXED_AMOUNT model requires rate >= 0 (absolute paise); got ${policy.rate}`);
  }
  if (policy.feePaise !== undefined && (policy.feePaise < 0 || !Number.isInteger(Number(policy.feePaise)))) {
    throw new PolicyValidationError(['feePaise'], `feePaise must be non-negative integer minor units; got ${policy.feePaise}`);
  }
  return policy as CommissionPolicy;
}
