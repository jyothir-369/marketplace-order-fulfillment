import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FulfillmentService } from './fulfillment.service';
import { AuditService } from '../common/audit';

export var VENDOR_SYNC_QUEUE = 'vendor-sync';

export interface VendorSyncJobData {
  jobId: string;
  orderLineItemId: string;
  vendorId: string;
  correlationId: string;
}

@Processor(VENDOR_SYNC_QUEUE)
export class VendorSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(VendorSyncProcessor.name);

  constructor(private readonly fulfillmentService: FulfillmentService) {
    super();
  }

  async process(job: Job<VendorSyncJobData>): Promise<void> {
    var data = job.data;
    // Ensure correlation ID is propagated
    const correlationId = data.correlationId || 'vendor-sync-' + data.jobId;

    this.logger.log(
      'Processing vendor sync job: ' + data.jobId + ' (vendor: ' + data.vendorId + ')',
      VendorSyncProcessor.name,
      correlationId,
    );
    try {
      await this.fulfillmentService.processSyncJob(data.jobId, correlationId);
      this.logger.log(
        'Vendor sync job completed: ' + data.jobId + ' (vendor: ' + data.vendorId + ')',
        VendorSyncProcessor.name,
        correlationId,
      );
    } catch (error) {
      var errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Vendor sync job failed: ' + data.jobId + ' (vendor: ' + data.vendorId + ') - ' + errorMessage,
        error instanceof Error ? error.stack : undefined,
        VendorSyncProcessor.name,
        correlationId,
      );
      throw error;
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job<VendorSyncJobData>): void {
    this.logger.log(
      'Vendor sync job active: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')',
      VendorSyncProcessor.name,
      job.data.correlationId,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<VendorSyncJobData>): void {
    this.logger.log(
      'Vendor sync job completed successfully: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')',
      VendorSyncProcessor.name,
      job.data.correlationId,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<VendorSyncJobData>, error: Error): void {
    this.logger.error(
      'Vendor sync job failed permanently: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ') - ' + error.message,
      error.stack,
      VendorSyncProcessor.name,
      job.data.correlationId,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(
      'Vendor sync job stalled: ' + jobId,
      VendorSyncProcessor.name,
    );
  }
}