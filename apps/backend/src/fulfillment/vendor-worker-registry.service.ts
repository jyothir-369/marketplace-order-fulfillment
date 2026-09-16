import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { FulfillmentService } from './fulfillment.service';
import { VendorQueueJobData } from './vendor-queue.service';
import { getBullMQConnectionOptions } from '../common/config/redis-connection.factory';
import { throttledLog } from '../common/log-throttle';

/**
 * On-demand worker registry for per-vendor BullMQ queues (Phase 1.2).
 *
 * Mirrors `VendorQueueService.getOrCreateVendorQueue`: the first time a vendor
 * queue is touched, this creates a matching `Worker` so a consumer always
 * exists before a job can be enqueued to that queue. This completes the
 * per-vendor concurrency-isolation design — the previous `vendor-sync-isolated`
 * processor listened on a queue nothing ever enqueued to.
 *
 * All workers share the same ioredis connection options as the rest of the app
 * (`getBullMQConnectionOptions`) so Redis-down behaviour stays consistent.
 */
@Injectable()
export class VendorWorkerRegistryService implements OnModuleDestroy {
  private readonly logger = new Logger(VendorWorkerRegistryService.name);
  private readonly workers = new Map<string, Worker<VendorQueueJobData>>();

  private readonly defaultConcurrency = 3;
  private readonly maxConcurrencyPerVendor = 10;

  constructor(
    private readonly fulfillmentService: FulfillmentService,
    private readonly configService: ConfigService,
  ) {}

  getOrCreateWorker(vendorId: string, concurrency?: number): Worker<VendorQueueJobData> {
    const queueName = 'vendor-sync-' + vendorId;
    const existing = this.workers.get(queueName);
    if (existing) {
      return existing;
    }

    const effectiveConcurrency = Math.min(concurrency || this.defaultConcurrency, this.maxConcurrencyPerVendor);

    const worker = new Worker<VendorQueueJobData>(
      queueName,
      async (job: Job<VendorQueueJobData>) => {
        const correlationId = job.data.correlationId || 'vendor-sync-' + job.data.jobId;
        this.logger.log('Processing vendor sync job: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')', VendorWorkerRegistryService.name, correlationId);
        return this.fulfillmentService.processSyncJob(job.data.jobId, correlationId);
      },
      {
        connection: getBullMQConnectionOptions(this.configService),
        concurrency: effectiveConcurrency,
      },
    );

    worker.on('error', (err: Error) => {
      throttledLog(
        'vendor-worker:error:' + vendorId,
        'warn',
        'Vendor worker ' + queueName + ' connection error: ' + (err?.message || 'unknown'),
        30_000,
        this.logger,
      );
    });

    worker.on('failed', (job: Job<VendorQueueJobData> | undefined, err: Error) => {
      // processSyncJob already records the failure (dead-letter / retry) and
      // rethrows; this listener surfaces it without double-handling.
      throttledLog(
        'vendor-worker:failed:' + (job?.data?.jobId || 'unknown'),
        'error',
        'Vendor sync job failed: ' + (job?.data?.jobId || 'unknown') + ' (vendor: ' + (job?.data?.vendorId || vendorId) + ') - ' + (err?.message || 'unknown'),
        30_000,
        this.logger,
      );
    });

    this.workers.set(queueName, worker);
    this.logger.log('Vendor worker created for queue: ' + queueName + ' (concurrency: ' + effectiveConcurrency + ')');
    return worker;
  }

  getWorker(vendorId: string): Worker<VendorQueueJobData> | undefined {
    return this.workers.get('vendor-sync-' + vendorId);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.workers.values()].map((worker) => worker.close()),
    );
    this.workers.clear();
  }
}