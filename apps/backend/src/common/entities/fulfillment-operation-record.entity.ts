import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum FulfillmentOperationState {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VENDOR_CALL_PENDING = 'vendor_call_pending',
  VENDOR_CONFIRMED = 'vendor_confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
  AMBIGUOUS = 'ambiguous',
}

@Entity('fulfillment_operation_records')
@Index(['operation_id'], { unique: true })
@Index(['sync_job_id'])
@Index(['operation_state', 'updated_at'])
export class FulfillmentOperationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'sync_job_id', nullable: true })
  syncJobId: string;

  @Column({ type: 'varchar', length: 64, name: 'operation_id', unique: true })
  operationId: string;

  @Column({ type: 'uuid', name: 'order_line_item_id', nullable: true })
  orderLineItemId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vendorId: string;

  @Column({
    type: 'enum',
    enum: FulfillmentOperationState,
    default: FulfillmentOperationState.PENDING,
  })
  operationState: FulfillmentOperationState;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'vendor_reference' })
  vendorReference: string;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'correlation_id' })
  correlationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;
}
