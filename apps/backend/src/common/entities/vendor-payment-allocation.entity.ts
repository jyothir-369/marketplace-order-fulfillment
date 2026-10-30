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

  @Column({ type: 'bigint' })
  amountPaise: number;

  @Column({ type: 'bigint' })
  commissionPaise: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 100 })
  rulesVersion: string;

  @Column({ type: 'bigint', nullable: true })
  grossLinePaise: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  reconciliationStatus: string | null;

  @Column({ type: 'text', nullable: true })
  snapshot: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
