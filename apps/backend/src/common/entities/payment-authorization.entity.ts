import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Lifecycle of a mock payment authorization (Phase 5.1).
 *
 *   authorized -> captured   (checkout succeeded; funds "held" then captured)
 *   authorized -> failed     (declined; only persisted outside checkout paths)
 *   captured   -> refunded   (order cancelled / explicit refund)
 */
export enum PaymentStatus {
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * A payment authorization against an order.
 *
 * Phase 5.1: this is deliberately a MOCK provider (`provider: 'mock'`) — no
 * real card data and no external calls — but the record is structurally real:
 * checkout only commits inventory + the order if a row can be written here,
 * and cancellation/refund flips the same row to `refunded`. That makes the
 * "transactional checkout" claim true for the financial leg too, not just
 * inventory.
 */
@Entity('payment_authorizations')
@Index(['orderId'])
export class PaymentAuthorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.AUTHORIZED,
  })
  status: PaymentStatus;

  /** Payment provider identifier. Always 'mock' in this phase. */
  @Column({ type: 'varchar', length: 32, default: 'mock' })
  provider: string;

  /** Provider-side reference for the authorization (e.g. PAY-XXXXXXXX). */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'provider_reference' })
  providerReference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'correlation_id' })
  correlationId: string | null;

  /** Human-facing reason when the authorization failed or was refunded. */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'failure_reason' })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
