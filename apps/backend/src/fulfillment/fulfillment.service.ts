import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, FindOptionsRelations } from 'typeorm';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { VendorSyncJob, SyncJobStatus, MAX_RETRY_ATTEMPTS } from '../common/entities/vendor-sync-job.entity';
import { Order, OrderStatus } from '../common/entities/order.entity';
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
    private readonly vendorMockService: VendorMockService,
    private readonly auditService: AuditService,
  ) {}

  async createSyncJob(dto: SyncJobDto): Promise<VendorSyncJob> {
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
    const relations: FindOptionsRelations<VendorSyncJob> = { orderLineItem: true };
    const syncJob = await this.syncJobRepository.findOne({ where: { id: jobId }, relations: relations });
    if (!syncJob) {
      throw new NotFoundException('Sync job ' + jobId + ' not found');
    }
    if (syncJob.status === SyncJobStatus.COMPLETED) {
      return;
    }

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
    const relations: FindOptionsRelations<VendorSyncJob> = { orderLineItem: true };
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
    const relations: FindOptionsRelations<OrderLineItem> = { syncJob: true };
    const lineItem = await this.lineItemRepository.findOne({ where: { id: lineItemId }, relations: relations });
    if (!lineItem) {
      throw new NotFoundException('Line item ' + lineItemId + ' not found');
    }

    const previousStatus = lineItem.fulfillmentStatus;
    const updateData: any = { fulfillmentStatus: dto.newStatus };
    if (dto.vendorReference) { updateData.vendorReference = dto.vendorReference; }
    if (dto.reason) { updateData.failureReason = dto.reason; }

    await this.lineItemRepository.update(lineItemId, updateData);

    if (lineItem.syncJob) {
      await this.syncJobRepository.update(lineItem.syncJob.id, {
        status: dto.newStatus === FulfillmentStatus.CONFIRMED ? SyncJobStatus.COMPLETED : SyncJobStatus.DEAD_LETTER,
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
    const allConfirmed = lineItems.every(
      (item) => item.fulfillmentStatus === FulfillmentStatus.CONFIRMED || item.fulfillmentStatus === FulfillmentStatus.FAILED,
    );
    const anyDeadLetter = lineItems.some((item) => item.fulfillmentStatus === FulfillmentStatus.DEAD_LETTER);

    if (allConfirmed) {
      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      if (order) {
        const previousStatus = order.status;
        const newStatus = anyDeadLetter ? OrderStatus.FULFILLING : OrderStatus.FULFILLED;
        await this.orderRepository.update(orderId, { status: newStatus });

        // Audit: log order status change
        await this.auditService.logOrderStatusChange(correlationId, orderId, previousStatus, newStatus);
      }
    }
  }

  async getDeadLetterJobs(): Promise<VendorSyncJob[]> {
    return this.syncJobRepository.find({
      where: { status: SyncJobStatus.DEAD_LETTER },
      relations: { orderLineItem: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getAmbiguousJobs(): Promise<VendorSyncJob[]> {
    return this.syncJobRepository.find({
      where: { status: SyncJobStatus.AMBIGUOUS },
      relations: { orderLineItem: true },
      order: { createdAt: 'DESC' },
    });
  }
}