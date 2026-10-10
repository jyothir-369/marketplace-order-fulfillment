import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, DataSource } from 'typeorm';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService, AuditEntityType, AuditAction } from '../common/audit';

export interface ReconciliationResult {
  reconciled: boolean;
  attemptId: string;
  orderId: string;
  previousStatus: string;
  newStatus: string | null;
  inventoryRestored: boolean;
  auditLogId?: string;
}

/**
 * Pending-checkout reconciliation — Phase 5.2.
 * Only proceeds when: attempt is AUTHORIZED, order is PLACED, and
 * expiry condition met. Leaves ambiguous/unavailable/timeout responses unchanged.
 */
@Injectable()
export class CheckoutReconciliationService {
  private readonly logger = new Logger(CheckoutReconciliationService.name);

  constructor(
    @InjectRepository(PaymentAuthorization)
    private readonly paymentRepo: Repository<PaymentAuthorization>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderLineItem)
    private readonly lineItemRepo: Repository<OrderLineItem>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
  ) {}

  async reconcileAttempt(attemptId: string, correlationId: string): Promise<ReconciliationResult> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const attempt = await manager.getRepository(PaymentAuthorization).findOne({
        where: { id: attemptId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!attempt) {
        throw new BadRequestException('Reconciliation attempt not found: ' + attemptId);
      }
      if (attempt.status !== PaymentStatus.AUTHORIZED) {
        return {
          reconciled: false,
          attemptId,
          orderId: attempt.orderId,
          previousStatus: attempt.status,
          newStatus: null,
          inventoryRestored: false,
        };
      }
      const order = await manager.getRepository(Order).findOne({
        where: { id: attempt.orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order || order.status === OrderStatus.CANCELLED || order.status === OrderStatus.FULFILLED) {
        return {
          reconciled: false,
          attemptId,
          orderId: attempt.orderId,
          previousStatus: attempt.status,
          newStatus: null,
          inventoryRestored: false,
        };
      }
      const ageMs = Date.now() - new Date(attempt.createdAt).getTime();
      const expiryMs = 30 * 60 * 1000;
      if (ageMs < expiryMs) {
        return {
          reconciled: false,
          attemptId,
          orderId: attempt.orderId,
          previousStatus: attempt.status,
          newStatus: null,
          inventoryRestored: false,
        };
      }
      const lineItems = await manager.getRepository(OrderLineItem).find({
        where: { orderId: attempt.orderId },
      });
      const itemsToRestore = lineItems.filter(
        (li) => li.fulfillmentStatus === FulfillmentStatus.PENDING || li.fulfillmentStatus === FulfillmentStatus.SYNCING,
      );
      for (const item of itemsToRestore) {
        await this.inventoryService.restoreStock(
          item.productId,
          item.quantity,
          correlationId,
          'Reconciliation: unpaid pending payment expired',
          manager,
        );
      }
      await manager.update(Order, { id: order.id }, { status: OrderStatus.CANCELLED });
      await manager.update(
        OrderLineItem,
        { orderId: order.id },
        { fulfillmentStatus: FulfillmentStatus.FAILED, failureReason: 'Reconciliation: unpaid pending expired' },
      );
      await manager.update(PaymentAuthorization, { id: attempt.id }, { status: PaymentStatus.FAILED, failureReason: 'Expired unpaid attempt after reconciliation' });
      const auditEntry = await this.auditService.log({
        correlationId,
        action: AuditAction.RECONCILIATION_RESOLVED,
        entityType: AuditEntityType.PAYMENT,
        entityId: attempt.id,
        previousState: { status: PaymentStatus.AUTHORIZED, orderStatus: order.status },
        newState: { status: PaymentStatus.FAILED, orderStatus: OrderStatus.CANCELLED },
        message: 'Pending payment expired and reconciled: inventory restored, order cancelled',
        metadata: { attemptId, orderId: order.id },
      });
      return {
        reconciled: true,
        attemptId,
        orderId: order.id,
        previousStatus: PaymentStatus.AUTHORIZED,
        newStatus: PaymentStatus.FAILED,
        inventoryRestored: itemsToRestore.length > 0,
        auditLogId: auditEntry.id,
      };
    });
  }

  async findEligibleAttempts(expiryMs = 30 * 60 * 1000): Promise<{ id: string; orderId: string; createdAt: Date }[]> {
    const since = new Date(Date.now() - expiryMs);
    const attempts = await this.paymentRepo.createQueryBuilder('p')
      .select(['p.id', 'p.orderId', 'p.createdAt', 'p.status'])
      .innerJoin('orders', 'o', 'o.id = p.order_id')
      .where('p.status IN (:...statuses)', { statuses: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] })
      .andWhere('o.status = :orderStatus', { orderStatus: OrderStatus.PLACED })
      .andWhere('p.created_at < :since', { since })
      .getRawMany();
    return attempts.map((a) => ({
      id: a.p_id,
      orderId: a.p_order_id,
      createdAt: a.p_created_at,
    }));
  }

  async retryReconciliation(attemptId: string, correlationId: string): Promise<ReconciliationResult> {
    const existing = await this.paymentRepo.findOne({ where: { id: attemptId } });
    if (!existing) {
      throw new BadRequestException('Attempt not found for retry: ' + attemptId);
    }
    if (existing.status !== PaymentStatus.AUTHORIZED) {
      return {
        reconciled: false,
        attemptId,
        orderId: existing.orderId,
        previousStatus: existing.status,
        newStatus: null,
        inventoryRestored: false,
      };
    }
    return this.reconcileAttempt(attemptId, correlationId);
  }
}
