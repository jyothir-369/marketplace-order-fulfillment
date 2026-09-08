import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { FulfillmentService } from './fulfillment.service';
import { VendorQueueService, VendorQueueJobData } from './vendor-queue.service';

export interface VendorWorkerConfig {
  vendorId: string;
  concurrency: number;
}

@Processor('vendor-sync-isolated')
export class VendorSyncIsolatedProcessor extends WorkerHost {
  private readonly logger = new Logger(VendorSyncIsolatedProcessor.name);
  private vendorWorker: Worker | null = null;
  private isInitialized = false;

  constructor(
    private readonly fulfillmentService: FulfillmentService,
    private readonly vendorQueueService: VendorQueueService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.log('Initializing VendorSyncIsolatedProcessor worker');

    this.vendorWorker = new Worker(
      'vendor-sync-isolated',
      async (job: Job<VendorQueueJobData>) => {
        return this.processJob(job);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        concurrency: 5,
      },
    );

    this.vendorWorker.on('completed', (job) => {
      this.logger.log(
        'Vendor sync job completed: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')',
        VendorSyncIsolatedProcessor.name,
        job.data.correlationId,
      );
    });

    this.vendorWorker.on('failed', (job, err) => {
      this.logger.error(
        'Vendor sync job failed: ' + (job?.data?.jobId || 'unknown') + ' - ' + err.message,
        err.stack,
        VendorSyncIsolatedProcessor.name,
        job?.data?.correlationId,
      );
    });

    this.isInitialized = true;
    this.logger.log('VendorSyncIsolatedProcessor worker initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.vendorWorker) {
      await this.vendorWorker.close();
      this.logger.log('VendorSyncIsolatedProcessor worker closed');
    }
  }

  async processJob(job: Job<VendorQueueJobData>): Promise<void> {
    const { jobId, vendorId, correlationId } = job.data;
    // Ensure correlation ID is propagated
    const effectiveCorrelationId = correlationId || 'vendor-sync-isolated-' + jobId;

    this.logger.log(
      'Processing vendor sync job: ' + jobId + ' for vendor: ' + vendorId,
      VendorSyncIsolatedProcessor.name,
      effectiveCorrelationId,
    );

    try {
      await this.fulfillmentService.processSyncJob(jobId, effectiveCorrelationId);

      this.logger.log(
        'Vendor sync job completed successfully: ' + jobId + ' (vendor: ' + vendorId + ')',
        VendorSyncIsolatedProcessor.name,
        effectiveCorrelationId,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        'Vendor sync job failed: ' + jobId + ' (vendor: ' + vendorId + ') - ' + errorMessage,
        error instanceof Error ? error.stack : undefined,
        VendorSyncIsolatedProcessor.name,
        effectiveCorrelationId,
      );

      throw error;
    }
  }

  async process(job: Job<VendorQueueJobData>): Promise<void> {
    return this.processJob(job);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<VendorQueueJobData>): void {
    this.logger.log(
      'Processing vendor sync job: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')',
      VendorSyncIsolatedProcessor.name,
      job.data.correlationId,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<VendorQueueJobData>): void {
    this.logger.log(
      'Vendor sync job completed: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')',
      VendorSyncIsolatedProcessor.name,
      job.data.correlationId,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<VendorQueueJobData> | undefined, error: Error): void {
    this.logger.error(
      'Vendor sync job failed: ' + (job?.data?.jobId || 'unknown') + ' - ' + error.message,
      error.stack,
      VendorSyncIsolatedProcessor.name,
      job?.data?.correlationId,
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string): void {
    this.logger.warn(
      'Job stalled: ' + jobId,
      VendorSyncIsolatedProcessor.name,
    );
  }
}