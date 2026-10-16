import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum VendorApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('vendor_applications')
export class VendorApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255, name: 'email' })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'business_name' })
  businessName: string;

  @Column({ type: 'text', name: 'reason' })
  reason: string;

  @Column({ type: 'enum', enum: VendorApplicationStatus, default: VendorApplicationStatus.PENDING, name: 'status' })
  status: VendorApplicationStatus;

  @Column({ type: 'uuid', nullable: true, name: 'applicant_user_id' })
  applicantUserId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewer_user_id' })
  reviewerUserId: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
