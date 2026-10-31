import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('payment_refunds')
@Index('uq_payment_refunds_reference', ['refundReference'], { unique: true })
@Index('idx_payment_refunds_order', ['orderReference'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  refundReference: string;

  @Column({ type: 'varchar', length: 255 })
  orderReference: string;

  @Column({ type: 'bigint' })
  amountPaise: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 50, default: 'REQUESTED' })
  state: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerRefundId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  reconciliationNote: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
