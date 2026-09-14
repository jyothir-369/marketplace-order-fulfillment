import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
  VersionColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';
import { Category } from './category.entity';
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

  /** URL-friendly slug derived from the product name (Phase 2). */
  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  slug: string | null;

  /** Category name, referencing `categories.name` (phase 2 enrichment). */
  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true })
  category: string | null;

  @ManyToOne(() => Category, (category) => category.products, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category', referencedColumnName: 'name' })
  categoryRelation: Category | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0, name: 'stock_count' })
  stockCount: number;

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