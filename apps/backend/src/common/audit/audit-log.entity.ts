import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  INVENTORY_DECREMENT = 'INVENTORY_DECREMENT',
  INVENTORY_RESTORE = 'INVENTORY_RESTORE',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  FULFILLMENT_STATUS_CHANGED = 'FULFILLMENT_STATUS_CHANGED',
  SYNC_JOB_CREATED = 'SYNC_JOB_CREATED',
  SYNC_JOB_STATUS_CHANGED = 'SYNC_JOB_STATUS_CHANGED',
  SYNC_JOB_RETRIED = 'SYNC_JOB_RETRIED',
  SYNC_JOB_DEAD_LETTER = 'SYNC_JOB_DEAD_LETTER',
  ADMIN_RESOLUTION = 'ADMIN_RESOLUTION',
  ADMIN_ORDER_CANCEL = 'ADMIN_ORDER_CANCEL',
  ADMIN_DEAD_LETTER_RETRY = 'ADMIN_DEAD_LETTER_RETRY',
  RECONCILIATION_RESOLVED = 'RECONCILIATION_RESOLVED',
  RECONCILIATION_FAILED = 'RECONCILIATION_FAILED',
  // Phase 5.1 — payments
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
}

export enum AuditEntityType {
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  ORDER_LINE_ITEM = 'ORDER_LINE_ITEM',
  VENDOR_SYNC_JOB = 'VENDOR_SYNC_JOB',
  PAYMENT = 'PAYMENT',
}

@Entity('audit_logs')
@Index(['correlationId'])
@Index(['entityType', 'entityId'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, name: 'correlation_id' })
  correlationId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entityType: AuditEntityType;

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true, name: 'previous_state' })
  previousState: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'new_state' })
  newState: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  message: string;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}