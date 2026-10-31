import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
@Entity('payment_outbox')
@Index(['operationType', 'state'], { unique: false })
export class PaymentOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  operationType: string; // 'transfer' | 'refund'

  @Column({ type: 'varchar', length: 255 })
  payloadReference: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  state: string; // PENDING | SUBMITTED | COMPLETED | FAILED

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  auditUser: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
