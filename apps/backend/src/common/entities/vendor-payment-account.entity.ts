import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
@Entity('vendor_payment_accounts')
@Index(['vendorId', 'provider'], { unique: true })
export class VendorPaymentAccount {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', name: 'vendorId' }) vendorId: string;
  @Column({ type: 'varchar', length: 50 }) provider: string; // 'razorpay'
  @Column({ type: 'varchar', length: 255 }) linkedAccountId: string | null;
  @Column({ type: 'varchar', length: 50, default: 'PENDING' }) onboardingState: string; // PENDING | ACTIVE | SUSPENDED
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
