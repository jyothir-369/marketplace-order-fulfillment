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
}
