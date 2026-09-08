import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob, SyncJobStatus } from '../common/entities/vendor-sync-job.entity';
import { AdminResolveDto, AdminDashboardDto, StuckOrdersResponseDto, StuckOrderDto, StuckOrderLineItemDto } from './dto/admin.dto';
import { OrdersService } from '../orders/orders.service';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { AuditService, AuditLogQuery } from '../common/audit';
import { AuditLog } from '../common/audit/audit-log.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderLineItem)
    private readonly lineItemRepository: Repository<OrderLineItem>,
    @InjectRepository(VendorSyncJob)
    private readonly syncJobRepository: Repository<VendorSyncJob>,
    private readonly ordersService: OrdersService,
    private readonly fulfillmentService: FulfillmentService,
    private readonly auditService: AuditService,
  ) {}

  async getDashboard(correlationId: string): Promise<AdminDashboardDto> {
    var totalOrders = await this.orderRepository.count();
    var deadLetterJobs = await this.syncJobRepository.count({ where: { status: SyncJobStatus.DEAD_LETTER } });
    var ambiguousJobs = await this.syncJobRepository.count({ where: { status: SyncJobStatus.AMBIGUOUS } });
    var statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();
    var countsByStatus = new Map();
    for (var i = 0; i < statusCounts.length; i++) {
      var s = statusCounts[i];
      countsByStatus.set(s.status, parseInt(s.count, 10));
    }
    return {
      totalOrders: totalOrders,
      pendingOrders: countsByStatus.get(OrderStatus.PLACED) || 0,
      fulfillingOrders: countsByStatus.get(OrderStatus.FULFILLING) || 0,
      fulfilledOrders: countsByStatus.get(OrderStatus.FULFILLED) || 0,
      cancelledOrders: countsByStatus.get(OrderStatus.CANCELLED) || 0,
      deadLetterJobs: deadLetterJobs,
      ambiguousJobs: ambiguousJobs,
    };
  }

  async getStuckOrders(correlationId: string): Promise<StuckOrdersResponseDto> {
    this.logger.log('Querying stuck orders', AdminService.name, correlationId);

    // Find orders with line items in stuck states:
    // - PENDING for > 10 minutes (stuck without vendor contact)
    // - SYNCING for > 5 minutes (vendor timeout)
    // - AMBIGUOUS (reconciliation couldn't resolve)
    // - DEAD_LETTER (exhausted retries)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Find stuck line items
    const stuckLineItems = await this.lineItemRepository
      .createQueryBuilder('li')
      .leftJoinAndSelect('li.syncJob', 'syncJob')
      .leftJoinAndSelect('li.product', 'product')
      .leftJoinAndSelect('li.order', 'order')
      .where('li.fulfillmentStatus IN (:...stuckStatuses)', {
        stuckStatuses: [
          FulfillmentStatus.PENDING,
          FulfillmentStatus.SYNCING,
          FulfillmentStatus.AMBIGUOUS,
          FulfillmentStatus.DEAD_LETTER,
        ],
      })
      .andWhere(
        '(li.fulfillmentStatus = :pending AND li.createdAt < :tenMinutesAgo) OR ' +
        '(li.fulfillmentStatus = :syncing AND li.updatedAt < :fiveMinutesAgo) OR ' +
        'li.fulfillmentStatus IN (:terminalStatuses)',
        {
          pending: FulfillmentStatus.PENDING,
          syncing: FulfillmentStatus.SYNCING,
          tenMinutesAgo: tenMinutesAgo,
          fiveMinutesAgo: fiveMinutesAgo,
          terminalStatuses: [FulfillmentStatus.AMBIGUOUS, FulfillmentStatus.DEAD_LETTER],
        },
      )
      .getMany();

    // Group by order
    const orderMap = new Map<string, StuckOrderDto>();
    for (const item of stuckLineItems) {
      if (!orderMap.has(item.orderId)) {
        const stuckReason = this.determineStuckReason(item);
        orderMap.set(item.orderId, {
          orderId: item.orderId,
          buyerId: item.order.buyerId,
          status: item.order.status,
          createdAt: item.order.createdAt,
          stuckReason: stuckReason,
          stuckLineItems: [],
        });
      }

      const lineItemDto: StuckOrderLineItemDto = {
        lineItemId: item.id,
        productId: item.productId,
        vendorId: item.vendorId,
        fulfillmentStatus: item.fulfillmentStatus,
        failureReason: item.failureReason || undefined,
        attempts: item.syncJob?.attempts || 0,
        lastAttemptedAt: item.syncJob?.lastAttemptedAt || undefined,
      };

      orderMap.get(item.orderId)!.stuckLineItems.push(lineItemDto);
    }

    const orders = Array.from(orderMap.values());
    return {
      total: orders.length,
      orders: orders,
    };
  }

  private determineStuckReason(item: OrderLineItem): string {
    switch (item.fulfillmentStatus) {
      case FulfillmentStatus.PENDING:
        return 'Pending vendor contact for more than 10 minutes';
      case FulfillmentStatus.SYNCING:
        return 'Vendor sync timed out (no response for 5+ minutes)';
      case FulfillmentStatus.AMBIGUOUS:
        return 'Ambiguous vendor response - reconciliation inconclusive';
      case FulfillmentStatus.DEAD_LETTER:
        return 'Vendor sync exhausted all retry attempts';
      default:
        return 'Unknown stuck condition';
    }
  }

  async resolveOrderLineItem(lineItemId: string, dto: AdminResolveDto, correlationId: string): Promise<void> {
    this.logger.log('Admin resolving line item ' + lineItemId + ' to ' + dto.newFulfillmentStatus, AdminService.name, correlationId);

    // Get current state for audit
    const currentItem = await this.lineItemRepository.findOne({ where: { id: lineItemId } });
    if (!currentItem) {
      throw new NotFoundException('Line item ' + lineItemId + ' not found');
    }

    await this.fulfillmentService.manualResolve(
      lineItemId,
      { newStatus: dto.newFulfillmentStatus, reason: dto.reason, vendorReference: dto.vendorReference },
      correlationId,
    );

    // Audit the admin action
    await this.auditService.logAdminResolution(
      correlationId,
      lineItemId,
      currentItem.fulfillmentStatus,
      dto.newFulfillmentStatus,
      'admin',
      dto.reason,
    );
  }

  async cancelOrder(orderId: string, correlationId: string): Promise<void> {
    this.logger.log('Admin cancelling order ' + orderId, AdminService.name, correlationId);

    // Get current state for audit
    const currentOrder = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!currentOrder) {
      throw new NotFoundException('Order ' + orderId + ' not found');
    }

    await this.ordersService.cancelOrder(orderId, correlationId);

    // Audit the admin action
    await this.auditService.logAdminOrderCancel(
      correlationId,
      orderId,
      'admin',
      currentOrder.status,
    );
  }

  async getDeadLetterDetails(correlationId: string): Promise<VendorSyncJob[]> {
    return this.fulfillmentService.getDeadLetterJobs();
  }

  async retryDeadLetterJob(jobId: string, correlationId: string): Promise<void> {
    var job = await this.syncJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job ' + jobId + ' not found');
    }

    await this.syncJobRepository.update(jobId, {
      status: SyncJobStatus.PENDING,
      attempts: 0,
      errorMessage: null,
    });
    await this.lineItemRepository.update(job.orderLineItemId, {
      fulfillmentStatus: FulfillmentStatus.PENDING,
      failureReason: null,
    });

    this.logger.log('Dead letter job ' + jobId + ' reset for retry', AdminService.name, correlationId);

    // Audit the admin action
    await this.auditService.logAdminDeadLetterRetry(
      correlationId,
      jobId,
      'admin',
    );
  }

  async getAuditLogs(
    query: AuditLogQuery,
    correlationId: string,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    this.logger.log('Querying audit logs', AdminService.name, correlationId);
    return this.auditService.queryLogs(query);
  }

  async getTrace(correlationId: string): Promise<AuditLog[]> {
    return this.auditService.getTrace(correlationId);
  }
}