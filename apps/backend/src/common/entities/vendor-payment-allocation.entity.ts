import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('vendor_payment_allocations')
@Index('uq_vendor_payment_allocation_order_vendor', ['orderReference', 'vendorId'], { unique: true })
@Index('uq_vendor_payment_allocation_idempotency', ['idempotencyKey'], { unique: true })
export class VendorPaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  orderReference: string;

  @Column({ type: 'varchar', length: 255 })
  vendorId: string;

  @Column({ name: 'amount_cents', type: 'bigint', nullable: true })
  amountCents: number | null;

  @Column({ name: 'commission_cents', type: 'bigint', nullable: true })
  commissionCents: number | null;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 100 })
  rulesVersion: string;

  @Column({ name: 'gross_line_cents', type: 'bigint', nullable: true })
  grossLineCents: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  reconciliationStatus: string | null;

  @Column({ type: 'text', nullable: true })
  snapshot: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
