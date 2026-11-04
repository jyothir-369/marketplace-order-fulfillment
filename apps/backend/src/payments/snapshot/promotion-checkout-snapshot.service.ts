import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PromotionCheckoutSnapshot } from './promotion-checkout-snapshot.entity';
import { CategoryBCalcService } from '../category-b/category-b-calc.service';

@Injectable()
export class PromotionCheckoutSnapshotService {
  constructor(
    @InjectRepository(PromotionCheckoutSnapshot)
    private readonly snapRepo: Repository<PromotionCheckoutSnapshot>,
    private readonly calc: CategoryBCalcService,
  ) {}

  private sameImmutableSnapshot(
    existing: PromotionCheckoutSnapshot,
    candidate: PromotionCheckoutSnapshot,
  ): boolean {
    const fields: (keyof PromotionCheckoutSnapshot)[] = [
      'promotionId',
      'checkoutAttemptId',
      'orderId',
      'currency',
      'fundingType',
      'vendorContributionPercent',
      'marketplaceContributionPercent',
      'approvalState',
      'discountPercent',
      'originalUnitPriceCents',
      'discountedUnitPriceCents',
      'discountAmountCents',
      'vendorFundingCents',
      'marketplaceFundingCents',
      'totalFundingCents',
      'lineItemId',
      'capturedAmountCents',
      'reconciled',
      'reconciliationNote',
    ];

    return fields.every((field) => existing[field] === candidate[field]);
  }

  async persistSnapshot(
    params: {
      promotionId: string;
      checkoutAttemptId: string;
      orderId: string;
      lineItemId: string;
      currency: 'USD';
      fundingType: string;
      vendorContributionPercent: number;
      marketplaceContributionPercent: number;
      approvalState: string;
      discountPercent: number;
      originalUnitPriceCents: number;
      qty: number;
      capturedAmountCents: number;
    },
    manager?: EntityManager,
  ): Promise<PromotionCheckoutSnapshot> {
    if (
      !params.promotionId ||
      !params.checkoutAttemptId ||
      !params.orderId ||
      !params.lineItemId
    ) {
      throw new Error('Snapshot identity fields are required');
    }

    if (params.approvalState !== 'APPROVED') {
      throw new Error('Only approved promotions can be snapshotted');
    }

    if (params.currency !== 'USD') {
      throw new Error('Category B promotion snapshots require USD');
    }

    // Blocker 4: validate contribution percentages and funding type before any calculation/persistence
    if (!Number.isFinite(params.vendorContributionPercent) || !Number.isFinite(params.marketplaceContributionPercent)) {
      throw new Error('Contribution percentages must be finite');
    }
    if (params.vendorContributionPercent < 0 || params.vendorContributionPercent > 100 || params.marketplaceContributionPercent < 0 || params.marketplaceContributionPercent > 100) {
      throw new Error('Contribution percentages must be in inclusive 0-100');
    }
    if (params.fundingType === 'CO_FUNDED' && (params.vendorContributionPercent + params.marketplaceContributionPercent !== 100)) {
      throw new Error('CO_FUNDED contributions must total exactly 100');
    }
    if (!['VENDOR_FUNDED', 'MARKETPLACE_FUNDED', 'CO_FUNDED'].includes(params.fundingType)) {
      throw new Error('Invalid funding type');
    }
    if (
      (params.fundingType === 'VENDOR_FUNDED' && (params.vendorContributionPercent !== 100 || params.marketplaceContributionPercent !== 0)) ||
      (params.fundingType === 'MARKETPLACE_FUNDED' && (params.vendorContributionPercent !== 0 || params.marketplaceContributionPercent !== 100))
    ) {
      throw new Error('Funding type does not match approved contribution percentages');
    }

    // Blocker 4: discount percent validation (must be finite, 0-100; not already guarded for percent itself)
    if (!Number.isFinite(params.discountPercent) || params.discountPercent < 0 || params.discountPercent > 100) {
      throw new Error('Discount percent must be between 0 and 100');
    }

    const integerInputs = [
      params.originalUnitPriceCents,
      params.qty,
      params.capturedAmountCents,
    ];

    if (
      integerInputs.some(
        (value) => !Number.isSafeInteger(value) || value < 0,
      ) ||
      params.originalUnitPriceCents < 1 ||
      params.qty < 1 ||
      params.capturedAmountCents < 0
    ) {
      throw new Error('Snapshot amounts and quantity must be valid integer values');
    }

    const discountedUnitPriceCents = this.calc.discountedUnitPriceCents(
      params.originalUnitPriceCents,
      params.discountPercent,
    );

    const grossCents = params.originalUnitPriceCents * params.qty;
    const discountedLineCents = discountedUnitPriceCents * params.qty;
    const discountAmountCents = grossCents - discountedLineCents;

    if (
      !Number.isSafeInteger(grossCents) ||
      !Number.isSafeInteger(discountedLineCents) ||
      !Number.isSafeInteger(discountAmountCents)
    ) {
      throw new Error('Snapshot calculation exceeds safe integer-cent limits');
    }

    const split = this.calc.fundingSplit(
      discountAmountCents,
      params.fundingType,
      params.vendorContributionPercent,
      params.marketplaceContributionPercent,
    );

    const reconciliation = this.calc.reconcile(
      params.originalUnitPriceCents,
      params.qty,
      params.discountPercent,
      params.fundingType,
      params.vendorContributionPercent,
      params.marketplaceContributionPercent,
      params.capturedAmountCents,
    );

    if (!reconciliation.reconciled) {
      throw new Error(reconciliation.note);
    }

    const repo = manager
      ? manager.getRepository(PromotionCheckoutSnapshot)
      : this.snapRepo;

    const candidate = repo.create({
      promotionId: params.promotionId,
      checkoutAttemptId: params.checkoutAttemptId,
      orderId: params.orderId,
      capturedAt: new Date(),
      currency: 'USD',
      fundingType: params.fundingType,
      vendorContributionPercent: params.vendorContributionPercent,
      marketplaceContributionPercent: params.marketplaceContributionPercent,
      approvalState: params.approvalState,
      discountPercent: params.discountPercent,
      originalUnitPriceCents: params.originalUnitPriceCents,
      discountedUnitPriceCents,
      discountAmountCents,
      vendorFundingCents: split.vendorFundingCents,
      marketplaceFundingCents: split.marketplaceFundingCents,
      totalFundingCents: split.totalFundingCents,
      lineItemId: params.lineItemId,
      capturedAmountCents: params.capturedAmountCents,
      reconciled: true,
      reconciliationNote: reconciliation.note,
    });

    const findExisting = async () =>
      repo.findOne({
        where: {
          checkoutAttemptId: params.checkoutAttemptId,
          lineItemId: params.lineItemId,
        },
      });

    const existing = await findExisting();

    if (existing) {
      if (!this.sameImmutableSnapshot(existing, candidate)) {
        throw new Error(
          'Conflicting immutable snapshot already exists for this checkout attempt and line item',
        );
      }
      return existing;
    }

    // Checkout integration supplies its transaction manager. PostgreSQL
    // ON CONFLICT DO NOTHING avoids aborting the transaction on a retry race.
    if (manager) {
      await repo
        .createQueryBuilder()
        .insert()
        .into(PromotionCheckoutSnapshot)
        .values(candidate)
        .orIgnore()
        .execute();

      const persisted = await findExisting();

      if (!persisted) {
        throw new Error(
          'Snapshot insert did not produce a persisted checkout snapshot',
        );
      }

      if (!this.sameImmutableSnapshot(persisted, candidate)) {
        throw new Error(
          'Concurrent checkout retry attempted to change an immutable promotion snapshot',
        );
      }

      return persisted;
    }

    // Compatibility path for existing isolated unit tests and non-checkout
    // callers. The actual checkout path must always supply its transaction manager.
    return this.snapRepo.save(candidate);
  }

  async findByOrder(orderId: string): Promise<PromotionCheckoutSnapshot[]> {
    return this.snapRepo.find({
      where: { orderId },
      order: { capturedAt: 'DESC' },
    });
  }
}