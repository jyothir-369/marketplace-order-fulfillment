import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  VersionColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { OrderLineItem } from './order-line-item.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.products)
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0, name: 'stock_count' })
  stockCount: number;

  /** Product category for filtering — e.g. Electronics, Apparel, Home & Living, Industrial. */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'category' })
  category: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @VersionColumn()
  version: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => OrderLineItem, (lineItem) => lineItem.product)
  orderLineItems: OrderLineItem[];
}
