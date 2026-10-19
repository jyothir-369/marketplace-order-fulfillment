import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Vendor } from './vendor.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'varchar', length: 255 }) title: string;

  @Column({ type: 'text', nullable: true }) description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 }) discountPercent: number;

  @Column({ type: 'boolean', default: true }) isActive: boolean;

  @Column({ type: 'timestamp', name: 'start_date', nullable: true }) startDate: Date | null;

  @Column({ type: 'timestamp', name: 'end_date', nullable: true }) endDate: Date | null;

  @Column({ type: 'uuid', name: 'vendor_id' }) vendorId: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.promotions)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
