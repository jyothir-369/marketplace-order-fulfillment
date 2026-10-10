import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditEntityType } from './audit-log.entity';

export interface AuditLogEntry {
  correlationId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  userId?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  correlationId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      correlationId: entry.correlationId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      previousState: entry.previousState || null,
      newState: entry.newState || null,
      userId: entry.userId || null,
      message: entry.message || null,
      metadata: entry.metadata || null,
    });

    const saved = await this.auditRepository.save(auditLog);

    this.logger.log(
      'AUDIT: [' + entry.action + '] ' + entry.entityType + ':' + entry.entityId + ' | correlationId=' + entry.correlationId + (entry.message ? ' | ' + entry.message : ''),
      AuditService.name,
    );

    return saved;
  }

  async logInventoryDecrement(
    correlationId: string,
    productId: string,
    previousStock: number,
    newStock: number,
    quantity: number,
    orderId?: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.INVENTORY_DECREMENT,
      entityType: AuditEntityType.PRODUCT,
      entityId: productId,
      previousState: { stockCount: previousStock },
      newState: { stockCount: newStock },
      message: 'Stock decremented by ' + quantity + ' (order: ' + (orderId || 'N/A') + ')',
      metadata: { quantity, orderId },
    });
  }

  async logInventoryRestore(
    correlationId: string,
    productId: string,
    previousStock: number,
    newStock: number,
    quantity: number,
    reason: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.INVENTORY_RESTORE,
      entityType: AuditEntityType.PRODUCT,
      entityId: productId,
      previousState: { stockCount: previousStock },
      newState: { stockCount: newStock },
      message: 'Stock restored by ' + quantity + ' | reason: ' + reason,
      metadata: { quantity, reason },
    });
  }

  async logOrderCreated(
    correlationId: string,
    orderId: string,
    buyerId: string,
    totalAmount: number,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.ORDER_CREATED,
      entityType: AuditEntityType.ORDER,
      entityId: orderId,
      newState: { buyerId, totalAmount, status: 'placed' },
      message: 'Order created for buyer: ' + buyerId + ' | amount: ' + totalAmount,
      metadata: { buyerId, totalAmount },
    });
  }

  async logOrderStatusChange(
    correlationId: string,
    orderId: string,
    previousStatus: string,
    newStatus: string,
    userId?: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: AuditEntityType.ORDER,
      entityId: orderId,
      previousState: { status: previousStatus },
      newState: { status: newStatus },
      userId: userId || null,
      message: 'Order status changed: ' + previousStatus + ' -> ' + newStatus,
      metadata: { previousStatus, newStatus },
    });
  }

  async logFulfillmentStatusChange(
    correlationId: string,
    lineItemId: string,
    previousStatus: string,
    newStatus: string,
    orderId?: string,
    vendorReference?: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.FULFILLMENT_STATUS_CHANGED,
      entityType: AuditEntityType.ORDER_LINE_ITEM,
      entityId: lineItemId,
      previousState: { fulfillmentStatus: previousStatus },
      newState: { fulfillmentStatus: newStatus, vendorReference: vendorReference || null },
      message: 'Fulfillment status changed: ' + previousStatus + ' -> ' + newStatus,
      metadata: { orderId, vendorReference },
    });
  }

  async logSyncJobCreated(
    correlationId: string,
    syncJobId: string,
    lineItemId: string,
    vendorId: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.SYNC_JOB_CREATED,
      entityType: AuditEntityType.VENDOR_SYNC_JOB,
      entityId: syncJobId,
      newState: { lineItemId, vendorId, status: 'pending' },
      message: 'Vendor sync job created for vendor: ' + vendorId,
      metadata: { lineItemId, vendorId },
    });
  }

  async logSyncJobStatusChange(
    correlationId: string,
    syncJobId: string,
    previousStatus: string,
    newStatus: string,
    attempts?: number,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.SYNC_JOB_STATUS_CHANGED,
      entityType: AuditEntityType.VENDOR_SYNC_JOB,
      entityId: syncJobId,
      previousState: { status: previousStatus },
      newState: { status: newStatus, attempts: attempts || 0 },
      message: 'Sync job status changed: ' + previousStatus + ' -> ' + newStatus,
      metadata: { attempts },
    });
  }

  async logSyncJobDeadLetter(
    correlationId: string,
    syncJobId: string,
    errorMessage: string,
    attempts: number,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.SYNC_JOB_DEAD_LETTER,
      entityType: AuditEntityType.VENDOR_SYNC_JOB,
      entityId: syncJobId,
      previousState: { status: 'pending' },
      newState: { status: 'dead_letter', attempts },
      message: 'Sync job moved to dead letter after ' + attempts + ' attempts',
      metadata: { errorMessage, attempts },
    });
  }

  async logAdminResolution(
    correlationId: string,
    lineItemId: string,
    previousStatus: string,
    newStatus: string,
    adminUserId: string,
    reason?: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.ADMIN_RESOLUTION,
      entityType: AuditEntityType.ORDER_LINE_ITEM,
      entityId: lineItemId,
      previousState: { fulfillmentStatus: previousStatus },
      newState: { fulfillmentStatus: newStatus },
      userId: adminUserId,
      message: 'Admin manual resolution: ' + previousStatus + ' -> ' + newStatus + (reason ? ' | reason: ' + reason : ''),
      metadata: { adminUserId, reason },
    });
  }

  async logAdminOrderCancel(
    correlationId: string,
    orderId: string,
    adminUserId: string,
    previousStatus: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.ADMIN_ORDER_CANCEL,
      entityType: AuditEntityType.ORDER,
      entityId: orderId,
      previousState: { status: previousStatus },
      newState: { status: 'cancelled' },
      userId: adminUserId,
      message: 'Admin cancelled order: ' + previousStatus + ' -> cancelled',
      metadata: { adminUserId },
    });
  }

  async logAdminDeadLetterRetry(
    correlationId: string,
    syncJobId: string,
    adminUserId: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.ADMIN_DEAD_LETTER_RETRY,
      entityType: AuditEntityType.VENDOR_SYNC_JOB,
      entityId: syncJobId,
      previousState: { status: 'dead_letter' },
      newState: { status: 'pending' },
      userId: adminUserId,
      message: 'Admin retried dead letter job',
      metadata: { adminUserId },
    });
  }

  /** Payment captured at checkout (Phase 5.1). */
  async logPaymentAuthorized(
    correlationId: string,
    paymentId: string,
    orderId: string,
    amount: number,
    providerReference?: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.PAYMENT_AUTHORIZED,
      entityType: AuditEntityType.PAYMENT,
      entityId: paymentId,
      newState: { status: 'captured', amount, providerReference: providerReference || null },
      message: 'Payment captured for order ' + orderId + ' | amount: ' + amount,
      metadata: { orderId, amount, providerReference },
    });
  }

  /**
   * A declined authorization. Logged on the audit service's own connection so
   * it survives the checkout transaction rollback (the decline is a real event
   * even though nothing else is persisted).
   */
  async logPaymentFailed(
    correlationId: string,
    orderId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.PAYMENT_FAILED,
      entityType: AuditEntityType.ORDER,
      entityId: orderId,
      previousState: { status: 'authorizing' },
      newState: { status: 'failed', amount, reason },
      message: 'Payment declined for order ' + orderId + ' | amount: ' + amount + ' | ' + reason,
      metadata: { orderId, amount, reason },
    });
  }

  /** Authorization reversed on cancellation / explicit refund (Phase 5.1). */
  async logPaymentRefunded(
    correlationId: string,
    paymentId: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.PAYMENT_REFUNDED,
      entityType: AuditEntityType.PAYMENT,
      entityId: paymentId,
      previousState: { status: 'captured' },
      newState: { status: 'refunded', amount },
      message: 'Payment refunded for order ' + orderId + ' | amount: ' + amount,
      metadata: { orderId, amount },
    });
  }

  async logReconciliationResolved(
    correlationId: string,
    syncJobId: string,
    resolution: string,
  ): Promise<void> {
    await this.log({
      correlationId,
      action: AuditAction.RECONCILIATION_RESOLVED,
      entityType: AuditEntityType.VENDOR_SYNC_JOB,
      entityId: syncJobId,
      previousState: { status: 'in_progress' },
      newState: { status: 'completed' },
      message: 'Reconciliation resolved: ' + resolution,
      metadata: { resolution },
    });
  }

  async queryLogs(query: AuditLogQuery): Promise<{ logs: AuditLog[]; total: number }> {
    const queryBuilder = this.auditRepository.createQueryBuilder('audit');

    if (query.correlationId) {
      queryBuilder.andWhere('audit.correlationId = :correlationId', { correlationId: query.correlationId });
    }
    if (query.entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.entityId) {
      queryBuilder.andWhere('audit.entityId = :entityId', { entityId: query.entityId });
    }
    if (query.action) {
      queryBuilder.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.fromDate) {
      queryBuilder.andWhere('audit.createdAt >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      queryBuilder.andWhere('audit.createdAt <= :toDate', { toDate: query.toDate });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .limit(query.limit || 100)
      .offset(query.offset || 0);

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  async getTrace(correlationId: string): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { correlationId },
      order: { createdAt: 'ASC' },
    });
  }
}