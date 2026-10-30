import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
@Entity('payment_transfers')
@Index(['vendorId', 'state'], { unique: false })
export class PaymentTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  providerTransferId: string | null;

  @Column({ type: 'varchar', length: 255, name: 'vendorId' })
  vendorId: string;

  @Column({ type: 'varchar', length: 255 })
  allocationReference: string;

  @Column({ type: 'varchar', length: 255 })
  orderReference: string;

  @Column({ type: 'int' })
  amountPaise: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 50 })
  destinationLinkedAccount: string;

  @Column({ type: 'varchar', length: 50, default: 'SCHEDULED' })
  state: string; // SCHEDULED | SUBMITTED | ACCEPTED | FAILED | REVERSED

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'text', nullable: true })
  providerResponse: string | null;

  @Column({ type: 'varchar', length: 255 })
  idempotencyKey: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
