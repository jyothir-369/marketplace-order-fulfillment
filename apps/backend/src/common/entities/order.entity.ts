import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { randomBytes } from 'crypto';
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
@Index(['status'])
@Index(['orderNumber'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Human-readable order number generated at checkout time.
   * Format: ORD-YYYYMMDD-XXXX (zero-padded random hex suffix).
   * Unique at the database level via @Index above.
   */
  @Column({ type: 'varchar', length: 20, name: 'order_number' })
  orderNumber: string;

  @Column({ type: 'uuid', name: 'buyer_id' })
  buyerId: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PLACED,
  })
  status: OrderStatus;

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

  /**
   * Idempotency reference from the client (CheckoutDto.idempotencyKey).
   * Used to dedupe checkout retries at the application layer.
   */
  @Column({ type: 'varchar', length: 120, nullable: true, name: 'client_reference_id' })
  clientReferenceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrderLineItem, (lineItem) => lineItem.order, { cascade: true })
  lineItems: OrderLineItem[];

  /**
   * Hook to auto-generate a human-readable order number before insert.
   * Format: ORD-YYYYMMDD-XXXX (XXXX = 4 random hex chars).
   * Unique constraint at the DB layer guarantees no collisions in practice.
   */
  @BeforeInsert()
  generateOrderNumber(): void {
    if (!this.orderNumber) {
      const now = new Date();
      const dateStr =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
      const suffix = randomBytes(2).toString('hex').toUpperCase();
      this.orderNumber = `ORD-${dateStr}-${suffix}`;
    }
  }
}