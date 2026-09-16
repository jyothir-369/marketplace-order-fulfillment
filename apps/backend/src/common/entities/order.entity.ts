import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderLineItem } from './order-line-item.entity';

export enum OrderStatus {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  FULFILLING = 'fulfilling',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
}

@Entity('orders')
@Index(['buyerId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'buyer_id' })
  buyerId: string;

  /**
   * The authenticated buyer user (users.id) that placed the order, when the
   * checkout was performed by a signed-in user. Nullable — legacy/anonymous
   * checkouts keep only `buyerId`. Powers `GET /api/orders/me` (Phase 2).
   */
  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'buyer_user_id' })
  buyerUserId: string | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PLACED,
  })
  status: OrderStatus;

  /**
   * Human-facing order reference (`ORD-YYYYMMDD-NNNNNN`), generated inside the
   * checkout transaction from the `order_number_seq` Postgres sequence.
   * Column pre-exists from migration 0003 (varchar(20) nullable unique);
   * migration 0008 adds the backing sequence.
   */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'order_number' })
  orderNumber: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'correlation_id' })
  correlationId: string;

  /**
   * Shipping address for the order.
   * Added as part of Phase 7 expand-and-contract migration.
   * Nullable to maintain backward compatibility during transition.
   */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'shipping_address' })
  shippingAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrderLineItem, (lineItem) => lineItem.order, { cascade: true })
  lineItems: OrderLineItem[];
}
