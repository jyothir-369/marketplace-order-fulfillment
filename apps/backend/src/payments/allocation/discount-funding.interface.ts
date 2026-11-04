export interface DiscountFundingPolicy {
  rulesVersion: string;
  discountTreatment: 'MARKETPLACE_FUNDED' | 'VENDOR_FUNDED';
  vendorDiscountRatePercent?: number;
  currency: string;
  activeFrom: Date;
  approved: boolean;
  appliesToPromotionIds?: string[];
}

export function validateDiscountFundingPolicy(
  policy: Partial<DiscountFundingPolicy> | null | undefined,
  rulesVersion?: string,
): DiscountFundingPolicy {
  if (!policy) {
    throw new Error('Discount funding policy missing (FAIL CLOSED)');
  }

  if (policy.approved !== true) {
    throw new Error('Discount funding policy is not approved');
  }

  if (
    typeof policy.rulesVersion !== 'string' ||
    policy.rulesVersion.trim().length === 0
  ) {
    throw new Error('Discount funding policy rulesVersion is required');
  }

  if (
    rulesVersion !== undefined &&
    policy.rulesVersion !== rulesVersion
  ) {
    throw new Error(
      `Discount funding policy rulesVersion mismatch: expected ${rulesVersion}, received ${policy.rulesVersion}`,
    );
  }

  if (policy.currency !== 'USD') {
    throw new Error('Discount funding policy supports USD only');
  }

  if (
    policy.discountTreatment !== 'MARKETPLACE_FUNDED' &&
    policy.discountTreatment !== 'VENDOR_FUNDED'
  ) {
    throw new Error('Invalid discount funding treatment');
  }

  const activeFrom = new Date(policy.activeFrom as Date);
  if (
    policy.activeFrom === undefined ||
    policy.activeFrom === null ||
    !Number.isFinite(activeFrom.getTime())
  ) {
    throw new Error('Discount funding policy activeFrom must be a valid date');
  }

  const rate = policy.vendorDiscountRatePercent;

  if (policy.discountTreatment === 'VENDOR_FUNDED') {
    if (
      typeof rate !== 'number' ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 100
    ) {
      throw new Error(
        'VENDOR_FUNDED policy requires vendorDiscountRatePercent between 0 and 100',
      );
    }
  } else if (rate !== undefined && rate !== 0) {
    throw new Error(
      'MARKETPLACE_FUNDED policy cannot assign a vendor discount rate',
    );
  }

  if (policy.appliesToPromotionIds !== undefined) {
    if (
      !Array.isArray(policy.appliesToPromotionIds) ||
      policy.appliesToPromotionIds.some(
        (id) => typeof id !== 'string' || id.trim().length === 0,
      )
    ) {
      throw new Error(
        'appliesToPromotionIds must contain non-empty promotion IDs',
      );
    }

    const normalizedIds = policy.appliesToPromotionIds.map((id) => id.trim());
    if (new Set(normalizedIds).size !== normalizedIds.length) {
      throw new Error('appliesToPromotionIds must not contain duplicates');
    }
  }

  return {
    rulesVersion: policy.rulesVersion,
    discountTreatment: policy.discountTreatment,
    ...(rate !== undefined ? { vendorDiscountRatePercent: rate } : {}),
    currency: 'USD',
    activeFrom,
    approved: true,
    ...(policy.appliesToPromotionIds !== undefined
      ? { appliesToPromotionIds: [...policy.appliesToPromotionIds] }
      : {}),
  };
}