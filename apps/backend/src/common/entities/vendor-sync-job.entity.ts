import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderLineItem } from './order-line-item.entity';

export enum SyncJobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  AMBIGUOUS = 'ambiguous',
  DEAD_LETTER = 'dead_letter',
}

export var MAX_RETRY_ATTEMPTS = 5;

@Entity('vendor_sync_jobs')
@Index(['status', 'lastAttemptedAt'])
export class VendorSyncJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_line_item_id' })
  orderLineItemId: string;

  @OneToOne(() => OrderLineItem, (lineItem) => lineItem.syncJob)
  @JoinColumn({ name: 'order_line_item_id' })
  orderLineItem: OrderLineItem;

  @Column({
    type: 'enum',
    enum: SyncJobStatus,
    default: SyncJobStatus.PENDING,
  })
  status: SyncJobStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', default: MAX_RETRY_ATTEMPTS, name: 'max_attempts' })
  maxAttempts: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_attempted_at' })
  lastAttemptedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'vendor_response' })
  vendorResponse: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'correlation_id' })
  correlationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}