/**
 * Category B — integer-cents promotion/funding snapshot.
 * All amounts in integer cents (minor units) for USD.
 * Preserves approved Category A percentages (approvalState, fundingType, vendorContributionPercent, marketplaceContributionPercent)
 * and adds deterministic snapshot + reconciliation.
 */
export interface PromotionFundingSnapshot {
  promotionId: string;
  checkoutAttemptId: string;
  orderId: string;
  capturedAt: Date;
  currency: 'USD'; // global payment currency preserved; not changed

  // Category A approved funding percentages preserved (verbatim, not recomputed)
  fundingType: 'VENDOR_FUNDED' | 'MARKETPLACE_FUNDED' | 'CO_FUNDED';
  vendorContributionPercent: number; // approved %, e.g. 30.00
  marketplaceContributionPercent: number; // approved %, e.g. 70.00
  approvalState: 'APPROVED'; // only approved promotions get snapshots

  // Discount (category B — integer cents only, no float arithmetic)
  discountPercent: number; // approved discount % (e.g. 20.00)
  originalUnitPriceCents: number;
  discountedUnitPriceCents: number; // = round(originalUnitPriceCents * (100 - discountPercent) / 100)
  discountAmountCents: number; // exact: original - discounted

  // Funding split in integer cents (deterministic, no float)
  vendorFundingCents: number;
  marketplaceFundingCents: number;
  totalFundingCents: number; // must equal vendorFundingCents + marketplaceFundingCents

  // Reconciliation verification fields
  lineItemId: string;
  capturedAmountCents: number; // amount actually captured; must reconcile to totalFundingCents + discountedUnitPriceCents * qty
  reconciled: boolean;
  reconciliationNote: string | null;
}

/** Deterministic integer-cent discount calculation (half-up, floating-point percentage arithmetic, result in integer cents). */
export function computeDiscountCents(originalCents: number, discountPercent: number): number {
  if (!Number.isSafeInteger(originalCents) || originalCents < 0) {
    throw new Error('originalCents must be non-negative safe integer');
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new Error('discountPercent must be between 0 and 100 inclusive');
  }

  // Convert the supplied decimal percentage into an exact rational fraction.
  const [coefficient, exponentText] = discountPercent.toString().toLowerCase().split('e');
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  const [whole, fraction = ''] = coefficient.split('.');
  let percentageNumerator = BigInt(whole + fraction);
  let percentageDenominator = 10n ** BigInt(fraction.length);

  if (exponent > 0) {
    percentageNumerator *= 10n ** BigInt(exponent);
  } else if (exponent < 0) {
    percentageDenominator *= 10n ** BigInt(-exponent);
  }

  const denominator = 100n * percentageDenominator;
  const numerator = BigInt(originalCents) *
    (denominator - percentageNumerator);

  // Exactly one half-up rounding operation, using integer arithmetic.
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded = quotient + (remainder * 2n >= denominator ? 1n : 0n);

  return Number(rounded);
}

export function computeFundingSplitCents(
  discountAmountCents: number,
  fundingType: 'VENDOR_FUNDED' | 'MARKETPLACE_FUNDED' | 'CO_FUNDED',
  vendorContributionPercent: number,
  marketplaceContributionPercent: number,
): { vendorFundingCents: number; marketplaceFundingCents: number } {
  if (!Number.isSafeInteger(discountAmountCents) || discountAmountCents < 0) throw new Error('discountAmountCents must be non-negative safe integer');
  if (!['VENDOR_FUNDED', 'MARKETPLACE_FUNDED', 'CO_FUNDED'].includes(fundingType)) throw new Error('invalid fundingType');
  if (fundingType === 'CO_FUNDED') {
    if (!Number.isFinite(vendorContributionPercent) || !Number.isFinite(marketplaceContributionPercent)) {
      throw new Error('CO_FUNDED percentages must be finite numbers');
    }
    if (vendorContributionPercent < 0 || vendorContributionPercent > 100 || marketplaceContributionPercent < 0 || marketplaceContributionPercent > 100) {
      throw new Error('CO_FUNDED individual percentages must be in inclusive 0-100');
    }
    // Strict exact-total enforcement: no rounding-based acceptance. Must equal 100 precisely.
    if (vendorContributionPercent + marketplaceContributionPercent !== 100) {
      throw new Error('CO_FUNDED vendor+marketplace must total exactly 100');
    }
  }
  if (fundingType === 'VENDOR_FUNDED') return { vendorFundingCents: discountAmountCents, marketplaceFundingCents: 0 };
  if (fundingType === 'MARKETPLACE_FUNDED') return { vendorFundingCents: 0, marketplaceFundingCents: discountAmountCents };
  // CO_FUNDED — deterministic half-up vendor split; exact remainder to marketplace (guarantees sum = discount)
  const vendor = Math.round((discountAmountCents * vendorContributionPercent) / 100);
  const marketplace = discountAmountCents - vendor; // exact remainder prevents any drift
  // Guarantee both outputs are non-negative safe integers and sum equals discount
  if (vendor < 0 || marketplace < 0 || !Number.isSafeInteger(vendor) || !Number.isSafeInteger(marketplace) || (vendor + marketplace) !== discountAmountCents) {
    throw new Error('CO_FUNDED funding outputs must be non-negative safe integers summing to discount');
  }
  return { vendorFundingCents: vendor, marketplaceFundingCents: marketplace };
}
