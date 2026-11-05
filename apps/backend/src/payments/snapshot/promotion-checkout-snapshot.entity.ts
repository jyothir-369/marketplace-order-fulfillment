/**
 * Category B — immutable promotion snapshot persisted during checkout.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('promotion_checkout_snapshots')
@Index('uq_promotion_snapshot_attempt_line', ['checkoutAttemptId', 'lineItemId'], { unique: true })
@Index('idx_snap_order', ['orderId', 'capturedAt'])
export class PromotionCheckoutSnapshot {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid', name: 'promotion_id' }) promotionId: string;
  @Column({ type: 'uuid', name: 'checkout_attempt_id' }) checkoutAttemptId: string;
  @Column({ type: 'uuid', name: 'order_id' }) orderId: string;
  @Column({ type: 'timestamp', name: 'captured_at' }) capturedAt: Date;

  @Column({ type: 'varchar', length: 3, default: 'USD', name: 'currency' }) currency: string;
  @Column({ type: 'varchar', length: 20, name: 'funding_type' }) fundingType: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'vendor_contribution_percent' }) vendorContributionPercent: number;
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'marketplace_contribution_percent' }) marketplaceContributionPercent: number;
  @Column({ type: 'varchar', length: 20, name: 'approval_state' }) approvalState: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'discount_percent' }) discountPercent: number;

  @Column({ type: 'int', name: 'original_unit_price_cents' }) originalUnitPriceCents: number;
  @Column({ type: 'int', name: 'discounted_unit_price_cents' }) discountedUnitPriceCents: number;
  @Column({ type: 'int', name: 'discount_amount_cents' }) discountAmountCents: number;
  @Column({ type: 'int', name: 'vendor_funding_cents' }) vendorFundingCents: number;
  @Column({ type: 'int', name: 'marketplace_funding_cents' }) marketplaceFundingCents: number;
  @Column({ type: 'int', name: 'total_funding_cents' }) totalFundingCents: number;

  @Column({ type: 'uuid', name: 'line_item_id' }) lineItemId: string;
  @Column({ type: 'int', name: 'captured_amount_cents' }) capturedAmountCents: number;
  @Column({ type: 'boolean', default: false, name: 'reconciled' }) reconciled: boolean;
  @Column({ type: 'text', nullable: true, name: 'reconciliation_note' }) reconciliationNote: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt: Date;
}