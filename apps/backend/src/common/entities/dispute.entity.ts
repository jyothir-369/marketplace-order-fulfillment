import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('payment_disputes')
@Index('uq_payment_disputes_provider_reference', ['providerDisputeId'], { unique: true })
@Index('idx_payment_disputes_order', ['orderReference'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  providerDisputeId: string;

  @Column({ type: 'varchar', length: 255 })
  orderReference: string;

  @Column({ type: 'varchar', length: 50, default: 'OPEN' })
  state: string;

  @Column({ type: 'bigint', nullable: true })
  amountPaise: number | null;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  providerPayload: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
