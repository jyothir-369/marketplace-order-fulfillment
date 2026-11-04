import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Vendor } from './vendor.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'varchar', length: 255 }) title: string;

  @Column({ type: 'text', nullable: true }) description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_percent' }) discountPercent: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' }) isActive: boolean;

  @Column({ type: 'timestamp', name: 'start_date', nullable: true }) startDate: Date | null;

  @Column({ type: 'timestamp', name: 'end_date', nullable: true }) endDate: Date | null;

  @Column({ type: 'uuid', name: 'vendor_id' }) vendorId: string;

  @Column({ type: 'uuid', name: 'approved_by', nullable: true }) approvedBy: string | null;

  @ManyToOne(() => Vendor, (vendor) => vendor.promotions)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'varchar', length: 20, default: 'VENDOR_FUNDED', name: 'funding_type' }) fundingType: 'VENDOR_FUNDED' | 'MARKETPLACE_FUNDED' | 'CO_FUNDED';

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'vendor_contribution_percent', nullable: true }) vendorContributionPercent: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'marketplace_contribution_percent', nullable: true }) marketplaceContributionPercent: number | null;

  @Column({ type: 'varchar', length: 3, default: 'USD', name: 'currency' }) currency: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING', name: 'approval_state' }) approvalState: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'timestamp', name: 'approved_at', nullable: true }) approvedAt: Date | null;

  @Column({ type: 'timestamp', name: 'submitted_at', nullable: true }) submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
