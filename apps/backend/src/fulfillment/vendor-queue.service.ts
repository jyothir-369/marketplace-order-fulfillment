import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { VendorWorkerRegistryService } from './vendor-worker-registry.service';
import { getBullMQConnectionOptions } from '../common/config/redis-connection.factory';
import { throttledLog } from '../common/log-throttle';

export interface VendorQueueJobData {
  jobId: string;
  orderLineItemId: string;
  vendorId: string;
  correlationId: string;
}

export interface VendorConcurrencyConfig {
  vendorId: string;
  concurrency: number;
  prefix?: string;
}

@Injectable()
export class VendorQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VendorQueueService.name);
  private readonly vendorQueues: Map<string, Queue<VendorQueueJobData>> = new Map();
  private readonly vendorQueueEvents: Map<string, QueueEvents> = new Map();
  
  private readonly defaultConcurrency = 3;
  private readonly maxConcurrencyPerVendor = 10;

  constructor(
    @InjectQueue('vendor-sync-base') private readonly baseQueue: Queue,
    private readonly configService: ConfigService,
    private readonly workerRegistry: VendorWorkerRegistryService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('VendorQueueService initialized');
    // Share the same consistent error handling for the base shared queue.
    this.baseQueue.on('error', (err: Error) => {
      throttledLog(
        'base-queue:error',
        'warn',
        'Base vendor-sync queue connection error: ' + (err?.message || 'unknown'),
        30_000,
        this.logger,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up vendor queues');
    for (const [vendorId, queue] of this.vendorQueues.entries()) {
      await queue.close();
      this.logger.log('Closed queue for vendor: ' + vendorId);
    }
    for (const [vendorId, events] of this.vendorQueueEvents.entries()) {
      await events.close();
    }
    this.vendorQueues.clear();
    this.vendorQueueEvents.clear();
  }

  getQueueName(vendorId: string): string {
    return 'vendor-sync-' + vendorId;
  }

  private getQueueEventsName(vendorId: string): string {
    return 'vendor-sync-' + vendorId + '-events';
  }

  async getOrCreateVendorQueue(vendorId: string, concurrency?: number): Promise<Queue<VendorQueueJobData>> {
    if (this.vendorQueues.has(vendorId)) {
      return this.vendorQueues.get(vendorId)!;
    }

    const queueName = this.getQueueName(vendorId);
    const effectiveConcurrency = Math.min(concurrency || this.defaultConcurrency, this.maxConcurrencyPerVendor);

    this.logger.log('Creating queue for vendor: ' + vendorId + ' with concurrency: ' + effectiveConcurrency);

    const queue = new Queue<VendorQueueJobData>(queueName, {
      connection: getBullMQConnectionOptions(this.configService),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    });

    queue.on('error', (err: Error) => {
      throttledLog(
        'vendor-queue:error:' + vendorId,
        'warn',
        'Vendor queue ' + queueName + ' connection error: ' + (err?.message || 'unknown'),
        30_000,
        this.logger,
      );
    });

    const queueEvents = new QueueEvents(queueName, {
      connection: getBullMQConnectionOptions(this.configService),
    });

    queueEvents.on('error', (err: Error) => {
      throttledLog(
        'vendor-events:error:' + vendorId,
        'warn',
        'Vendor queue events connection error (' + vendorId + '): ' + (err?.message || 'unknown'),
        30_000,
        this.logger,
      );
    });

    // Phase 1.2: a worker must exist before any job hits this queue, otherwise
    // jobs sink silently. Create the matching on-demand worker alongside it.
    this.workerRegistry.getOrCreateWorker(vendorId, effectiveConcurrency);

    this.vendorQueues.set(vendorId, queue);
    this.vendorQueueEvents.set(vendorId, queueEvents);

    this.logger.log('Vendor queue created: ' + queueName + ' (concurrency: ' + effectiveConcurrency + ')');

    return queue;
  }

  async addJobToVendorQueue(
    vendorId: string,
    data: VendorQueueJobData,
    options?: {
      concurrency?: number;
      attempts?: number;
      backoffDelay?: number;
    },
  ): Promise<void> {
    const queue = await this.getOrCreateVendorQueue(vendorId, options?.concurrency);

    const jobOptions = {
      attempts: options?.attempts || 5,
      backoff: {
        type: 'exponential' as const,
        delay: options?.backoffDelay || 1000,
      },
      removeOnComplete: 100,
      removeOnFail: 1000,
    };

    await queue.add('vendor-sync', data, jobOptions);
    
    this.logger.log(
      'Job added to vendor queue: ' + vendorId + ' for sync job: ' + data.jobId,
      VendorQueueService.name,
      data.correlationId,
    );
  }

  async addJobToVendorQueueWithRetry(
    vendorId: string,
    data: VendorQueueJobData,
    retryCount: number,
  ): Promise<void> {
    const queue = await this.getOrCreateVendorQueue(vendorId);

    await queue.add('vendor-sync-retry-' + retryCount, data, {
      attempts: Math.max(5 - retryCount, 1),
      backoff: {
        type: 'exponential',
        delay: Math.min(1000 * Math.pow(2, retryCount), 60000),
      },
      removeOnComplete: 100,
      removeOnFail: 1000,
    });

    this.logger.log(
      'Retry job added to vendor queue: ' + vendorId + ' for sync job: ' + data.jobId + ' (retry: ' + retryCount + ')',
      VendorQueueService.name,
      data.correlationId,
    );
  }

  getVendorQueue(vendorId: string): Queue<VendorQueueJobData> | undefined {
    return this.vendorQueues.get(vendorId);
  }

  getAllVendorQueues(): Map<string, Queue<VendorQueueJobData>> {
    return this.vendorQueues;
  }

  async configureVendorConcurrency(vendorId: string, concurrency: number): Promise<void> {
    const effectiveConcurrency = Math.min(concurrency, this.maxConcurrencyPerVendor);
    
    if (this.vendorQueues.has(vendorId)) {
      this.logger.log(
        'Updating concurrency for vendor: ' + vendorId + ' to ' + effectiveConcurrency,
        VendorQueueService.name,
      );
    }

    await this.getOrCreateVendorQueue(vendorId, effectiveConcurrency);
    
    this.logger.log(
      'Vendor concurrency configured: ' + vendorId + ' = ' + effectiveConcurrency,
      VendorQueueService.name,
    );
  }

  async getQueueStats(vendorId: string): Promise<{
    vendorId: string;
    queueName: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | null> {
    const queue = this.vendorQueues.get(vendorId);
    if (!queue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      vendorId,
      queueName: this.getQueueName(vendorId),
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async getAllQueueStats(): Promise<Array<{
    vendorId: string;
    queueName: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>> {
    const stats: Array<{
      vendorId: string;
      queueName: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }> = [];

    for (const [vendorId, queue] of this.vendorQueues.entries()) {
      const stat = await this.getQueueStats(vendorId);
      if (stat) {
        stats.push(stat);
      }
    }

    return stats;
  }
}