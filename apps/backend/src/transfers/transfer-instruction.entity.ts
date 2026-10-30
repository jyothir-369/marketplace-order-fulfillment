import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('transfer_instructions')
@Index(['allocationReference', 'vendorId'], { unique: true })
export class TransferInstruction {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'varchar', length: 255 }) orderReference: string;
  @Column({ type: 'varchar', length: 255 }) allocationReference: string;
  @Column({ type: 'varchar', length: 255 }) vendorId: string;

  @Column({ type: 'int' }) amountPaise: number;
  @Column({ type: 'varchar', length: 10, default: 'INR' }) currency: string;

  @Column({ type: 'varchar', length: 255 }) policyVersion: string;
  @Column({ type: 'varchar', length: 50, default: 'PENDING' }) state: string; // uses TransferState

  @Column({ type: 'varchar', length: 255 }) idempotencyKey: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) destinationLinkedAccount: string | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', nullable: true }) lastAttemptAt: Date | null;
  @Column({ type: 'int', default: 0 }) attempts: number;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
