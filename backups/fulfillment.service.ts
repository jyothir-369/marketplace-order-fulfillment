import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, FindOptionsRelations } from 'typeorm';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob, SyncJobStatus, MAX_RETRY_ATTEMPTS } from '../common/entities/vendor-sync-job.entity';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';
import { VendorMockService } from '../integrations/vendor-mock/vendor-mock.service';
import { VendorFulfillmentRequestDto } from '../integrations/vendor-mock/dto/vendor-mock.dto';
import { SyncJobDto, ReconciliationResultDto, ManualResolutionDto } from './dto/fulfillment.dto';
import { AuditService } from '../common/audit';

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(
    @InjectRepository(OrderLineItem)
    private readonly lineItemRepository: Repository<OrderLineItem>,
    @InjectRepository(VendorSyncJob)
    private readonly syncJobRepository: Repository<VendorSyncJob>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(PaymentAuthorization)
    private readonly paymentRepository: Repository<PaymentAuthorization>,
    private readonly vendorMockService: VendorMockService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Keep unpaid provider payments out of vendor fulfillment.
   * Orders predating persisted payments remain backward-compatible.
   */
  private async assertPaymentCapturedOrLegacy(orderId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    if (!payment) return;

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new ConflictException(
        'Payment must be captured before vendor fulfillment can proceed.',
      );
    }
  }
  async createSyncJob(dto: SyncJobDto): Promise<VendorSyncJob> {
    const lineItem = await this.lineItemRepository.findOne({
      where: { id: dto.orderLineItemId },
    });
    if (!lineItem) {
      throw new NotFoundException('Order line item not found');
    }
    if (lineItem.orderId !== dto.orderId || lineItem.vendorId !== dto.vendorId) {
      throw new ConflictException('Sync job order/vendor does not match the line item.');
    }
    await this.assertPaymentCapturedOrLegacy(lineItem.orderId);
    this.logger.log('Creating sync job for line item ' + dto.orderLineItemId, FulfillmentService.name, dto.correlationId);
    const syncJob = this.syncJobRepository.create({
      orderLineItemId: dto.orderLineItemId,
      status: SyncJobStatus.PENDING,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      correlationId: dto.correlationId,
    });
    const saved = await this.syncJobRepository.save(syncJob);

    // Audit: log sync job creation
    await this.auditService.logSyncJobCreated(
      dto.correlationId,
      saved.id,
      dto.orderLineItemId,
      dto.vendorId,
    );

    return saved;
  }

  async processSyncJob(jobId: string, correlationId: string): Promise<void> {
    this.logger.log('Processing sync job ' + jobId, FulfillmentService.name, correlationId);
    const relations: FindOptionsRelations<VendorSyncJob> = { orderLineItem: true } as FindOptionsRelations<VendorSyncJob>;
    const syncJob = await this.syncJobRepository.findOne({ where: { id: jobId }, relations: relations });
    if (!syncJob) {
      throw new NotFoundException('Sync job ' + jobId + ' not found');
    }
    if (syncJob.status === SyncJobStatus.COMPLETED) {
      return;
    }
    if (!syncJob.orderLineItem?.orderId) {
      throw new NotFoundException('Sync job order line item is missing');
    }
    await this.assertPaymentCapturedOrLegacy(syncJob.orderLineItem.orderId);

    const previousStatus = syncJob.status;
    await this.syncJobRepository.update(jobId, {
      status: SyncJobStatus.IN_PROGRESS,
      attempts: syncJob.attempts + 1,
      lastAttemptedAt: new Date(),
    });

    await this.lineItemRepository.update(syncJob.orderLineItemId, { fulfillmentStatus: FulfillmentStatus.SYNCING });

    // Audit: log sync job status change
    await this.auditService.logSyncJobStatusChange(
      correlationId,
      jobId,
      previousStatus,
      SyncJobStatus.IN_PROGRESS,
      syncJob.attempts + 1,
    );

    try {
      const lineItem = syncJob.orderLineItem;
      const request: VendorFulfillmentRequestDto = {
        orderId: lineItem.orderId,
        lineItemId: lineItem.id,
        productId: lineItem.productId,
        vendorId: lineItem.vendorId,
        quantity: lineItem.quantity,
        correlationId: correlationId,
      };
      const response = await this.vendorMockService.requestFulfillment(request, correlationId);

      if (response.success) {
        await this.syncJobRepository.update(jobId, {
          status: SyncJobStatus.COMPLETED,
          completedAt: new Date(),
          vendorResponse: JSON.stringify(response),
        });

        const previousFulfillmentStatus = lineItem.fulfillmentStatus;
        await this.lineItemRepository.update(syncJob.orderLineItemId, {
          fulfillmentStatus: FulfillmentStatus.CONFIRMED,
          vendorReference: response.vendorReference,
        });

        // Audit: log fulfillment status change
        await this.auditService.logFulfillmentStatusChange(
          correlationId,
          lineItem.id,
          previousFulfillmentStatus,
          FulfillmentStatus.CONFIRMED,
          lineItem.orderId,
          response.vendorReference,
        );

        // Audit: log sync job completion
        await this.auditService.logSyncJobStatusChange(
          correlationId,
          jobId,
          SyncJobStatus.IN_PROGRESS,
          SyncJobStatus.COMPLETED,
          syncJob.attempts + 1,
        );

        await this.checkOrderFulfillment(lineItem.orderId, correlationId);
      } else {
        await this.handleSyncFailure(syncJob, response.message || 'Vendor API failed', correlationId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handleSyncFailure(syncJob, errorMessage, correlationId);
    }
  }

  async handleSyncFailure(syncJob: VendorSyncJob, errorMessage: string, correlationId: string): Promise<void> {
    const newAttempts = syncJob.attempts + 1;
    const previousStatus = syncJob.status;

    if (newAttempts >= syncJob.maxAttempts) {
      await this.syncJobRepository.update(syncJob.id, {
        status: SyncJobStatus.DEAD_LETTER,
        attempts: newAttempts,
        lastAttemptedAt: new Date(),
        errorMessage: errorMessage,
      });

      const previousFulfillmentStatus = syncJob.orderLineItem?.fulfillmentStatus || FulfillmentStatus.PENDING;
      await this.lineItemRepository.update(syncJob.orderLineItemId, {
        fulfillmentStatus: FulfillmentStatus.DEAD_LETTER,
        failureReason: 'Max retries exceeded: ' + errorMessage,
      });

      // Audit: log dead letter
      await this.auditService.logSyncJobDeadLetter(correlationId, syncJob.id, errorMessage, newAttempts);

      // Audit: log fulfillment status change
      await this.auditService.logFulfillmentStatusChange(
        correlationId,
        syncJob.orderLineItemId,
        previousFulfillmentStatus,
        FulfillmentStatus.DEAD_LETTER,
        syncJob.orderLineItem?.orderId,
      );
    } else {
      await this.syncJobRepository.update(syncJob.id, {
        status: SyncJobStatus.PENDING,
        attempts: newAttempts,
        lastAttemptedAt: new Date(),
        errorMessage: errorMessage,
      });

      // Audit: log sync job status change (retry)
      await this.auditService.logSyncJobStatusChange(
        correlationId,
        syncJob.id,
        previousStatus,
        SyncJobStatus.PENDING,
        newAttempts,
      );
    }
  }

  async reconcile(olderThanMinutes = 10): Promise<ReconciliationResultDto> {
    const reconciliationCorrelationId = 'reconciliation-' + Date.now();
    const result: ReconciliationResultDto = { processed: 0, resolved: 0, stillAmbiguous: 0, errors: [] };
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const relations: FindOptionsRelations<VendorSyncJob> = { orderLineItem: true } as FindOptionsRelations<VendorSyncJob>;
    const ambiguousJobs = await this.syncJobRepository.find({
      where: { status: SyncJobStatus.IN_PROGRESS, lastAttemptedAt: LessThan(cutoffTime) },
      relations: relations,
    });

    for (const job of ambiguousJobs) {
      result.processed++;
      const correlationId = job.correlationId || reconciliationCorrelationId;
      try {
        const lineItem = job.orderLineItem;
        if (lineItem && lineItem.vendorReference) {
          const statusResponse = await this.vendorMockService.queryFulfillmentStatus(
            lineItem.vendorId,
            lineItem.vendorReference,
            correlationId,
          );

          if (statusResponse.success) {
            await this.syncJobRepository.update(job.id, { status: SyncJobStatus.COMPLETED, completedAt: new Date() });
            await this.lineItemRepository.update(lineItem.id, { fulfillmentStatus: FulfillmentStatus.CONFIRMED });

            // Audit: log reconciliation resolution
            await this.auditService.logReconciliationResolved(correlationId, job.id, 'Vendor confirmed fulfillment');

            result.resolved++;
          } else {
            await this.syncJobRepository.update(job.id, { status: SyncJobStatus.AMBIGUOUS });
            await this.lineItemRepository.update(lineItem.id, { fulfillmentStatus: FulfillmentStatus.AMBIGUOUS });
            result.stillAmbiguous++;
          }
        } else {
          // No vendor reference - retry the job
          await this.syncJobRepository.update(job.id, { status: SyncJobStatus.PENDING });
          result.resolved++;
        }
      } catch (error) {
        result.errors.push('Job ' + job.id + ': ' + (error instanceof Error ? error.message : 'Unknown'));
      }
    }

    return result;
  }

  async manualResolve(lineItemId: string, dto: ManualResolutionDto, correlationId: string): Promise<void> {
    const relations: FindOptionsRelations<OrderLineItem> = { syncJob: true } as FindOptionsRelations<OrderLineItem>;
    const lineItem = await this.lineItemRepository.findOne({ where: { id: lineItemId }, relations: relations });
    if (!lineItem) {
      throw new NotFoundException('Line item ' + lineItemId + ' not found');
    }

    const previousStatus = lineItem.fulfillmentStatus;
    const resolvableStatuses = [FulfillmentStatus.AMBIGUOUS, FulfillmentStatus.DEAD_LETTER];
    const resolutionStatuses = [FulfillmentStatus.CONFIRMED, FulfillmentStatus.FAILED];

    if (!resolvableStatuses.includes(previousStatus)) {
      throw new ConflictException(
        'Cannot manually resolve line item from fulfillment status ' + previousStatus,
      );
    }

    if (!resolutionStatuses.includes(dto.newStatus)) {
      throw new ConflictException(
        'Manual resolution must set fulfillment status to confirmed or failed',
      );
    }

    const updateData: any = { fulfillmentStatus: dto.newStatus };
    if (dto.vendorReference) { updateData.vendorReference = dto.vendorReference; }
    if (dto.reason) { updateData.failureReason = dto.reason; }

    await this.lineItemRepository.update(lineItemId, updateData);

    if (lineItem.syncJob) {
      await this.syncJobRepository.update(lineItem.syncJob.id, {
        status: dto.newStatus === FulfillmentStatus.CONFIRMED ? SyncJobStatus.COMPLETED : SyncJobStatus.FAILED,
      });
    }

    // Audit: log fulfillment status change (manual resolution)
    await this.auditService.logFulfillmentStatusChange(
      correlationId,
      lineItemId,
      previousStatus,
      dto.newStatus,
      lineItem.orderId,
      dto.vendorReference,
    );

    await this.checkOrderFulfillment(lineItem.orderId, correlationId);
  }

  async checkOrderFulfillment(orderId: string, correlationId: string): Promise<void> {
    const lineItems = await this.lineItemRepository.find({ where: { orderId } });
    const allConfirmed = lineItems.length > 0 && lineItems.every(
      (item) => item.fulfillmentStatus === FulfillmentStatus.CONFIRMED,
    );
    const anyDeadLetter = lineItems.some((item) => item.fulfillmentStatus === FulfillmentStatus.DEAD_LETTER);
    const anyFailed = lineItems.some((item) => item.fulfillmentStatus === FulfillmentStatus.FAILED);

    if (allConfirmed || anyDeadLetter || anyFailed) {
      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      if (order) {
        // Phase 0 hardening: never flip a terminal order back to an active
        // status. A cancelled or fulfilled order must stay terminal even if
        // every line item later reads as confirmed/failed.
        if (order.status === OrderStatus.FULFILLED || order.status === OrderStatus.CANCELLED) {
          return;
        }

        const previousStatus = order.status;
        const newStatus =
          allConfirmed && !anyDeadLetter && !anyFailed
            ? OrderStatus.FULFILLED
            : OrderStatus.FULFILLING;

        if (previousStatus !== newStatus) {
          await this.orderRepository.update(orderId, { status: newStatus });

          // Audit: log order status change
          await this.auditService.logOrderStatusChange(
            correlationId,
            orderId,
            previousStatus,
            newStatus,
          );
        }
      }
    }
  }

  async getDeadLetterJobs(vendorId?: string): Promise<VendorSyncJob[]> {
    // Phase 3.3: a VENDOR caller sees only their own tenant's jobs; admin/ops
    // (no vendorId) see everything.
    const qb = this.syncJobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.orderLineItem', 'lineItem')
      .where('job.status = :status', { status: SyncJobStatus.DEAD_LETTER })
      .orderBy('job.createdAt', 'DESC');

    if (vendorId) {
      qb.andWhere('lineItem.vendorId = :vendorId', { vendorId });
    }

    return qb.getMany();
  }

  async getAmbiguousJobs(vendorId?: string): Promise<VendorSyncJob[]> {
    const qb = this.syncJobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.orderLineItem', 'lineItem')
      .where('job.status = :status', { status: SyncJobStatus.AMBIGUOUS })
      .orderBy('job.createdAt', 'DESC');

    if (vendorId) {
      qb.andWhere('lineItem.vendorId = :vendorId', { vendorId });
    }

    return qb.getMany();
  }
}