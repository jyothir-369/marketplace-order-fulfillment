import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { User, UserRole } from "../common/entities/user.entity";
import { Vendor } from "../common/entities/vendor.entity";
import { AuthService } from "../auth/auth.service";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob, SyncJobStatus } from '../common/entities/vendor-sync-job.entity';
import { AdminResolveDto, AdminDashboardDto, StuckOrdersResponseDto, StuckOrderDto, StuckOrderLineItemDto } from './dto/admin.dto';
import { OrdersService } from '../orders/orders.service';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { AuditService, AuditLogQuery } from '../common/audit';
import { AuditLog, AuditAction, AuditEntityType } from '../common/audit/audit-log.entity';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly ordersService: OrdersService,
    private readonly fulfillmentService: FulfillmentService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  async getDashboard(correlationId: string): Promise<AdminDashboardDto> {
    const totalOrders = await this.orderRepository.count();
    const deadLetterJobs = await this.syncJobRepository.count({ where: { status: SyncJobStatus.DEAD_LETTER } });
    const ambiguousJobs = await this.syncJobRepository.count({ where: { status: SyncJobStatus.AMBIGUOUS } });
    const statusCounts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();
    const countsByStatus = new Map();
    for (let i = 0; i < statusCounts.length; i++) {
      const s = statusCounts[i];
      countsByStatus.set(s.status, parseInt(s.count, 10));
    }
    // Revenue rule: recognized revenue = orders with CAPTURED payment authorization
    // (status CONFIRMED / FULFILLING / FULFILLED). CANCELLED orders with REFUNDED
    // payments are excluded; FAILED payments never contribute.
    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('payment_authorizations', 'pa', 'pa.order_id = order.id')
      .select('COALESCE(SUM(order.totalAmount), 0)', 'total')
      .where("pa.status = 'captured'")
      .andWhere('order.status IN (:...included)', {
        included: [
          OrderStatus.CONFIRMED,
          OrderStatus.FULFILLING,
          OrderStatus.FULFILLED,
        ],
      })
      .getRawOne();
    const totalRevenue = parseFloat(revenueResult?.total ?? '0');
    return {
      totalOrders: totalOrders,
      totalRevenue: totalRevenue,
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
    const job = await this.syncJobRepository.findOne({ where: { id: jobId } });
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

  // ---------------------------------------------------------------------------
  // Phase 1 — Admin vendor-account linking (D1)
  // ---------------------------------------------------------------------------

  async listLinkedUsers(vendorId: string, correlationId: string): Promise<{ id: string; email: string; role: UserRole; vendorId: string | null }[]> {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const users = await this.userRepository.find({ where: { vendorId } });
    return users.map(u => ({ id: u.id, email: u.email, role: u.role, vendorId: u.vendorId }));
  }

  async linkUser(vendorId: string, email: string, correlationId: string): Promise<{ message: string; transitioned: boolean }> {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    if (!user) throw new NotFoundException('User not found');
    if ([UserRole.ADMIN, UserRole.OPERATIONS].includes(user.role)) {
      throw new ConflictException('Privileged roles cannot be demoted via vendor linking');
    }
    if (user.vendorId === vendorId) {
      return { message: 'User already linked to this vendor', transitioned: false };
    }
    if (user.vendorId && user.vendorId !== vendorId) {
      throw new ConflictException('User already linked to a different vendor');
    }
    let transitioned = false;
    await this.userRepository.manager.transaction(async (manager) => {
      const locked = await manager.findOne(User, { where: { id: user.id }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new NotFoundException('User disappeared during link');
      if (locked.role === UserRole.ADMIN || locked.role === UserRole.OPERATIONS) {
        throw new ConflictException('Privileged roles cannot be demoted');
      }
      if (locked.vendorId === vendorId && locked.role === UserRole.VENDOR) {
        transitioned = false; // idempotent
        return;
      }
      if (locked.vendorId && locked.vendorId !== vendorId) {
        throw new ConflictException('User already linked to different vendor');
      }
      await manager.update(User, user.id, { role: UserRole.VENDOR, vendorId: vendorId });
      transitioned = true;
    });
    if (transitioned) {
      await this.authService.revokeAllForUser(user.id);
      await this.auditService.log({
        correlationId,
        action: AuditAction.ADMIN_RESOLUTION,
        entityType: AuditEntityType.ORDER,
        entityId: user.id,
        message: `Vendor link: ${user.email} -> ${vendorId}`,
      });
      return { message: 'User linked', transitioned: true };
    }
    return { message: 'User already linked to this vendor', transitioned: false };
  }

  async unlinkUser(vendorId: string, userId: string, correlationId: string): Promise<{ message: string; transitioned: boolean }> {
    const vendor = await this.vendorRepository.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.vendorId !== vendorId) {
      throw new ConflictException('User is not linked to this vendor');
    }
    let transitioned = false;
    await this.userRepository.manager.transaction(async (manager) => {
      const locked = await manager.findOne(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      if (!locked) throw new NotFoundException('User disappeared during unlink');
      if (locked.vendorId !== vendorId) {
        throw new ConflictException('User is not linked to this vendor');
      }
      await manager.update(User, userId, { role: UserRole.BUYER, vendorId: null });
      transitioned = true;
    });
    if (transitioned) {
      await this.authService.revokeAllForUser(userId);
      await this.auditService.log({
        correlationId,
        action: AuditAction.ADMIN_RESOLUTION,
        entityType: AuditEntityType.ORDER_LINE_ITEM,
        entityId: userId,
        message: `Vendor unlink: ${user.email} from ${vendorId}`,
      });
    }
    return { message: 'User unlinked', transitioned };
  }
}
