import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { User, UserRole } from "../common/entities/user.entity";
import { Vendor } from "../common/entities/vendor.entity";
import { AuthService } from "../auth/auth.service";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob, SyncJobStatus } from '../common/entities/vendor-sync-job.entity';
import { VendorApplication, VendorApplicationStatus } from '../vendor/vendor-application.entity';
import { Product } from '../common/entities/product.entity';
import { AdminResolveDto, AdminDashboardDto, StuckOrdersResponseDto, StuckOrderDto, StuckOrderLineItemDto, AdminAnalyticsDto } from './dto/admin.dto';
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
    @InjectRepository(VendorApplication)
    private readonly vendorApplicationRepository: Repository<VendorApplication>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly ordersService: OrdersService,
    private readonly fulfillmentService: FulfillmentService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  async getKPI(correlationId: string): Promise<{ aov: number; activeVendors: number; pendingApplications: number; fulfillmentRate: number; categoryTrends: Array<{ category: string; count: number }>; vendorTrends: Array<{ vendorName: string; productCount: number }>; operationalAlerts: Array<{ type: string; message: string; severity: string }>; recentActivity: Array<{ label: string; timestamp: string }> }> {
    // AOV = average totalAmount of fulfilled orders (real data). Use enum value to avoid string-mismatch errors with DB enum.
    const aovRow = await this.orderRepository.createQueryBuilder('o').select('AVG(o.totalAmount)', 'aov').where("o.status = :status", { status: OrderStatus.FULFILLED }).getRawOne();
    const aov = aovRow?.aov == null ? 0 : parseFloat(aovRow.aov);

    const activeVendors = await this.vendorRepository.count();
    const pendingApplications = await this.vendorApplicationRepository.count({ where: { status: VendorApplicationStatus.PENDING } });

    // Fulfillment rate = fulfilled / (fulfilled + cancelled + failed) — 'failed' is not a valid OrderStatus; guard against phantom counts.
    const statusCounts = await this.orderRepository.createQueryBuilder('o').select("o.status", "status").addSelect("COUNT(*)", "c").groupBy("o.status").getRawMany();
    let fulfilled = 0, cancelled = 0;
    for (const r of statusCounts) { if (r.status === 'fulfilled') fulfilled = parseInt(r.c,10); if (r.status === 'cancelled') cancelled = parseInt(r.c,10); }
    const totalProcessed = fulfilled + cancelled;
    const fulfillmentRate = totalProcessed > 0 ? Math.round((fulfilled / totalProcessed) * 100) : 0;

    // Category trends (top 5 by product count)
    const catRows = await this.productRepository.createQueryBuilder('p').select("p.category", "cat").addSelect("COUNT(*)", "cnt").where("p.category IS NOT NULL").groupBy("p.category").orderBy("cnt", "DESC").limit(5).getRawMany();
    const categoryTrends = catRows.map((r: any) => ({ category: String(r.cat), count: parseInt(r.cnt,10) }));

    // Vendor trends (top 5 vendors by product count)
    const vendorRows = await this.vendorRepository.createQueryBuilder('v').leftJoin('v.products', 'p').select("v.name", "name").addSelect("COUNT(p.id)", "cnt").groupBy("v.id").addGroupBy("v.name").orderBy("cnt", "DESC").limit(5).getRawMany();
    const vendorTrends = vendorRows.map((r: any) => ({ vendorName: String(r.name), productCount: parseInt(r.cnt,10) }));

    // Operational alerts (dead-letter / ambiguous / low stock batches)
    const dead = await this.syncJobRepository.count({ where: { status: SyncJobStatus.DEAD_LETTER } });
    const ambiguous = await this.syncJobRepository.count({ where: { status: SyncJobStatus.AMBIGUOUS } });
    const alerts = [];
    if (dead > 0) alerts.push({ type: 'dead-letter', message: `${dead} dead-letter sync job(s)`, severity: 'critical' });
    if (ambiguous > 0) alerts.push({ type: 'ambiguous', message: `${ambiguous} ambiguous sync job(s)`, severity: 'warning' });
    if (pendingApplications > 0) alerts.push({ type: 'pending-applications', message: `${pendingApplications} pending vendor application(s)`, severity: 'info' });

    // Recent activity: last 5 orders created
    const recentOrders = await this.orderRepository.find({ order: { createdAt: 'DESC' }, take: 5, select: { id: true, status: true, createdAt: true, buyerId: true } });
    const recentActivity = recentOrders.map((o: any) => ({ label: `Order ${o.id.slice(0,8)} ${o.status}`, timestamp: o.createdAt.toISOString() }));

    return { aov, activeVendors, pendingApplications, fulfillmentRate, categoryTrends, vendorTrends, operationalAlerts: alerts, recentActivity };
  }

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

  /**
   * Operational telemetry for the admin dashboard.
   *
   * TRUTHFULNESS CONTRACT — every number below is derived only from columns
   * that are semantically valid for the metric, and anything that cannot be
   * computed safely is reported as explicitly unavailable (null + note)
   * rather than approximated or zero-filled.
   *
   *   - THROUGHPUT: orders bucketed by `orders.created_at` (the order's
   *     placement time) per calendar day, counted by the CURRENT status of
   *     each order. This is an order-arrival-per-day series, not a
   *     state-transition series: there is no trustworthy "time of transition"
   *     column in this schema, so status is read as-of-now. The units are
   *     orders per day. Buckets are rendered in UTC.
   *   - LATENCY: vendor sync duration, computed as
   *     `vendor_sync_jobs.completed_at - vendor_sync_jobs.created_at`.
   *     This population is restricted to jobs that actually reached
   *     COMPLETED, because `completed_at` is only written on the success
   *     path (fulfillment.service.ts) and is NULL for pending / in-progress /
   *     failed / dead-letter jobs. Mixing those in would either drop rows
   *     silently or treat an open job's age as a latency sample, so they are
   *     excluded and the sample size is reported alongside the average.
   *
   * NO customer data is exposed: the queries aggregate over time buckets and
   * never select buyer ids, order ids, emails, or names.
   */
  async getAnalytics(correlationId: string, days = 14): Promise<AdminAnalyticsDto> {
    this.logger.log('Computing admin analytics telemetry', AdminService.name, correlationId);

    // Bounded window: never more than 90 days, never fewer than 1.
    // undefined -> NaN -> Math.floor NaN=NaN -> || 14 fallback to default.
    const windowDays = Math.min(90, Math.max(1, Math.floor(Number.isFinite(days) ? days : 14)) || 14);

    // Anchor the window to whole UTC days so buckets are stable and the
    // label matches the bucket exactly.
    const endExclusive = new Date();
    endExclusive.setUTCHours(23, 59, 59, 999);
    const startInclusive = new Date(endExclusive.getTime() - (windowDays - 1) * 24 * 60 * 60 * 1000);
    startInclusive.setUTCHours(0, 0, 0, 0);

    const throughput = await this.getThroughputSeries(startInclusive, endExclusive, windowDays);
    const latency = await this.getVendorSyncLatency(startInclusive, endExclusive);

    return {
      window: {
        start: startInclusive.toISOString(),
        end: endExclusive.toISOString(),
        timezone: 'UTC',
      },
      throughput,
      latency,
      sources: [
        'orders.createdAt (order placement time)',
        'orders.status (current status, as-of-now snapshot)',
        'vendor_sync_jobs.createdAt',
        'vendor_sync_jobs.completedAt',
      ],
    };
  }

  /**
   * Orders placed per UTC day, split by the order's current status.
   *
   * Uses a parameterized, bounded `date_trunc` bucketing query over a
   * half-open interval [start, end]. Days with no orders are emitted as
   * explicit zero buckets so the chart renders a continuous axis.
   */
  private async getThroughputSeries(
    startInclusive: Date,
    endExclusive: Date,
    windowDays: number,
  ): Promise<AdminAnalyticsDto['throughput']> {
    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .select("date_trunc('day', order.createdAt)", 'bucket')
      .addSelect('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt >= :start', { start: startInclusive })
      .andWhere('order.createdAt <= :end', { end: endExclusive })
      .groupBy("date_trunc('day', order.createdAt)")
      .addGroupBy('order.status')
      .getRawMany();

    const buckets = new Map<string, { placed: number; fulfilling: number; fulfilled: number; cancelled: number }>();
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(startInclusive.getTime() + i * 24 * 60 * 60 * 1000);
      buckets.set(d.toISOString().slice(0, 10), { placed: 0, fulfilling: 0, fulfilled: 0, cancelled: 0 });
    }

    for (const row of rows) {
      if (!row || !row.bucket) continue;
      const key = new Date(row.bucket).toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      const count = Number(row.count ?? 0);
      switch (row.status) {
        case OrderStatus.FULFILLING:
          bucket.fulfilling += count;
          break;
        case OrderStatus.FULFILLED:
          bucket.fulfilled += count;
          break;
        case OrderStatus.CANCELLED:
          bucket.cancelled += count;
          break;
        default:
          // PLACED and CONFIRMED both count as still-open arrivals; the
          // frontend's "placed" series is the total arrivals for the day.
          bucket.placed += count;
          break;
      }
    }

    return Array.from(buckets.entries()).map(([date, counts]) => ({ date, ...counts }));
  }

  /**
   * Average vendor sync duration (ms) over the window.
   *
   * Population: vendor sync jobs whose status is COMPLETED and whose
   * `completed_at` is non-null. Jobs still queued, in flight, failed, or
   * dead-lettered are excluded — their `completed_at` is NULL and their age
   * is not a latency sample.
   */
  private async getVendorSyncLatency(
    startInclusive: Date,
    endExclusive: Date,
  ): Promise<AdminAnalyticsDto['latency']> {
    const row = await this.syncJobRepository
      .createQueryBuilder('job')
      .select('AVG(EXTRACT(EPOCH FROM (job.completedAt - job.createdAt)) * 1000)', 'averageMs')
      .addSelect('COUNT(*)', 'sampleCount')
      .where('job.status = :status', { status: SyncJobStatus.COMPLETED })
      .andWhere('job.completedAt IS NOT NULL')
      .andWhere('job.createdAt >= :start', { start: startInclusive })
      .andWhere('job.createdAt <= :end', { end: endExclusive })
      .getRawOne();

    const count = Number(row?.sampleCount ?? 0);
    const rawAverage = row?.averageMs === null || row?.averageMs === undefined ? null : Number(row.averageMs);

    return {
      computedFrom: 'vendor_sync_jobs.completedAt - vendor_sync_jobs.createdAt',
      unit: 'milliseconds',
      averageMs: count > 0 && rawAverage !== null && Number.isFinite(rawAverage) ? Math.round(rawAverage) : null,
      count,
      note:
        count > 0
          ? 'Average vendor sync duration over completed sync jobs only. Jobs that are pending, in progress, failed, or dead-lettered are excluded because they have no completedAt timestamp.'
          : 'Unavailable: no completed vendor sync jobs in this window, so no latency sample can be computed. Non-completed jobs are excluded because their completedAt timestamp is NULL.',
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
        'li.fulfillmentStatus = :ambiguousStatus OR li.fulfillmentStatus = :deadLetterStatus',
        {
          pending: FulfillmentStatus.PENDING,
          syncing: FulfillmentStatus.SYNCING,
          tenMinutesAgo: tenMinutesAgo,
          fiveMinutesAgo: fiveMinutesAgo,
          ambiguousStatus: FulfillmentStatus.AMBIGUOUS,
          deadLetterStatus: FulfillmentStatus.DEAD_LETTER,
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

  async getOrders(
    query: { status?: string; limit?: number; offset?: number },
    correlationId: string,
  ): Promise<{ total: number; orders: { orderId: string; buyerId: string; status: string; createdAt: Date; lineItems: any[]; stuckReason?: string }[] }> {
    this.logger.log('Querying paginated orders', AdminService.name, correlationId);

    const limitVal = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const offsetVal = query.offset && query.offset > 0 ? query.offset : 0;

    const qb = this.orderRepository.createQueryBuilder('order');

    if (query.status && query.status !== 'all') {
      const statusNormalized = String(query.status).toLowerCase();
      const statusUpper = statusNormalized.toUpperCase();
      qb.andWhere('order.status = :status', { status: statusUpper });
    }

    qb.orderBy('order.created_at', 'DESC');

    const [ordersRaw, total] = await qb
      .skip(offsetVal)
      .take(limitVal)
      .getManyAndCount();

    const orders = ordersRaw.map((o) => ({
      orderId: o.id,
      buyerId: o.buyerId,
      status: o.status,
      createdAt: o.createdAt,
      lineItems: [],
    }));

    return { total, orders };
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
