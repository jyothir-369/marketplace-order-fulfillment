import { Injectable } from '@nestjs/common';
import { computeDiscountCents, computeFundingSplitCents } from './category-b.snapshot.interface';

@Injectable()
export class CategoryBCalcService {
  discountedUnitPriceCents(originalCents: number, discountPercent: number): number {
    if (!Number.isSafeInteger(originalCents) || originalCents < 1) {
      throw new Error('Original price must be positive safe integer cents');
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    const discounted = computeDiscountCents(originalCents, discountPercent);
    if (!Number.isSafeInteger(discounted) || discounted < 0 || discounted > originalCents) {
      throw new Error('Discount calculation returned invalid integer cents');
    }
    return discounted;
  }

  fundingSplit(
    discountAmountCents: number,
    fundingType: string,
    vendorPct: number,
    marketplacePct: number,
  ): { vendorFundingCents: number; marketplaceFundingCents: number; totalFundingCents: number } {
    if (!Number.isSafeInteger(discountAmountCents) || discountAmountCents < 0) {
      throw new Error('Funding amount must be non-negative safe integer cents');
    }
    if (!Number.isFinite(vendorPct) || !Number.isFinite(marketplacePct) ||
        vendorPct < 0 || vendorPct > 100 || marketplacePct < 0 || marketplacePct > 100 ||
        vendorPct + marketplacePct !== 100) {
      throw new Error('Funding contribution percentages must be finite, in inclusive 0-100, and total exactly 100');
    }

    if (
      (fundingType === 'VENDOR_FUNDED' && (vendorPct !== 100 || marketplacePct !== 0)) ||
      (fundingType === 'MARKETPLACE_FUNDED' && (vendorPct !== 0 || marketplacePct !== 100)) ||
      !['VENDOR_FUNDED', 'MARKETPLACE_FUNDED', 'CO_FUNDED'].includes(fundingType)
    ) {
      throw new Error('Funding type does not match its approved contribution percentages');
    }

    const split = computeFundingSplitCents(
      discountAmountCents,
      fundingType as any,
      vendorPct,
      marketplacePct,
    );

    const vendorFundingCents = split.vendorFundingCents;
    const marketplaceFundingCents = split.marketplaceFundingCents;
    const totalFundingCents = vendorFundingCents + marketplaceFundingCents;

    if (
      !Number.isSafeInteger(vendorFundingCents) ||
      !Number.isSafeInteger(marketplaceFundingCents) ||
      vendorFundingCents < 0 ||
      marketplaceFundingCents < 0 ||
      totalFundingCents !== discountAmountCents
    ) {
      throw new Error('Funding allocation does not exactly reconcile to the discount');
    }

    return { vendorFundingCents, marketplaceFundingCents, totalFundingCents };
  }

  reconcile(
    originalCents: number,
    qty: number,
    discountPercent: number,
    fundingType: string,
    vendorPct: number,
    marketplacePct: number,
    capturedAmountCents: number,
  ): { reconciled: boolean; note: string; expectedCents: number } {
    if (!Number.isSafeInteger(qty) || qty < 1) {
      throw new Error('Quantity must be a positive safe integer');
    }
    if (!Number.isSafeInteger(capturedAmountCents) || capturedAmountCents < 0) {
      throw new Error('Captured amount must be non-negative safe integer cents');
    }

    const discountedUnitCents = this.discountedUnitPriceCents(originalCents, discountPercent);
    const grossCents = originalCents * qty;
    const expectedCents = discountedUnitCents * qty;
    const discountAmountCents = grossCents - expectedCents;

    if (
      !Number.isSafeInteger(grossCents) ||
      !Number.isSafeInteger(expectedCents) ||
      !Number.isSafeInteger(discountAmountCents) ||
      discountAmountCents < 0
    ) {
      throw new Error('Checkout calculation exceeds safe integer-cent limits');
    }

    const split = this.fundingSplit(
      discountAmountCents,
      fundingType,
      vendorPct,
      marketplacePct,
    );

    const captureMatches = capturedAmountCents === expectedCents;
    const fundingMatches = split.totalFundingCents === discountAmountCents;

    return {
      reconciled: captureMatches && fundingMatches,
      note: captureMatches && fundingMatches
        ? 'customer capture and funding allocation reconciled'
        : `reconciliation failed: expectedCapture=${expectedCents}; actualCapture=${capturedAmountCents}; discount=${discountAmountCents}; funding=${split.totalFundingCents}`,
      expectedCents,
    };
  }
}