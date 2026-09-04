import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { Vendor } from './vendor.entity';
import { VendorSyncJob } from './vendor-sync-job.entity';

export enum FulfillmentStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
  AMBIGUOUS = 'ambiguous',
}

@Entity('order_line_items')
@Index(['orderId', 'vendorId'])
export class OrderLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.lineItems)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.orderLineItems)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'uuid', name: 'vendor_id' })
  vendorId: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.orderLineItems)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  lineTotal: number;

  @Column({
    type: 'enum',
    enum: FulfillmentStatus,
    default: FulfillmentStatus.PENDING,
    name: 'fulfillment_status',
  })
  fulfillmentStatus: FulfillmentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'vendor_reference' })
  vendorReference: string;

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason: string;

  @OneToOne(() => VendorSyncJob, (syncJob) => syncJob.orderLineItem)
  syncJob: VendorSyncJob;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}