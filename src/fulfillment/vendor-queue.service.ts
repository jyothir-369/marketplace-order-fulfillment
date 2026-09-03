import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

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

const VENDOR_CONFIG_PREFIX = 'vendor:config:';

@Injectable()
export class VendorQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VendorQueueService.name);
  private readonly vendorQueues: Map<string, Queue<VendorQueueJobData>> = new Map();
  private readonly vendorQueueEvents: Map<string, QueueEvents> = new Map();
  private readonly defaultConcurrency = 3;
  private readonly maxConcurrencyPerVendor = 10;
  private redis: Redis;

  constructor(
    @InjectQueue('vendor-sync-base') private readonly baseQueue: Queue,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
      await this.loadPersistedVendorConfigs();
      this.logger.log('VendorQueueService initialized with Redis-backed config');
    } catch (err) {
      this.logger.warn(
        'Redis unavailable for vendor config; falling back to in-memory defaults. ' +
        (err instanceof Error ? err.message : String(err)),
        VendorQueueService.name,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [, queue] of this.vendorQueues.entries()) {
      await queue.close();
    }
    for (const [, events] of this.vendorQueueEvents.entries()) {
      await events.close();
    }
    this.vendorQueues.clear();
    this.vendorQueueEvents.clear();
    await this.redis.quit();
    this.logger.log('VendorQueueService cleaned up');
  }

  private concurrencyKey(vendorId: string): string {
    return `${VENDOR_CONFIG_PREFIX}${vendorId}:concurrency`;
  }

  /**
   * Load any previously persisted vendor concurrency configurations from Redis
   * during module initialization. This ensures configs survive service restarts.
   */
  private async loadPersistedVendorConfigs(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${VENDOR_CONFIG_PREFIX}*`);
      const loaded: string[] = [];
      for (const key of keys) {
        // Only load keys that end with :concurrency to avoid picking up future config fields
        if (key.endsWith(':concurrency')) {
          const raw = await this.redis.get(key);
          if (raw !== null) {
            const vendorId = key.replace(`${VENDOR_CONFIG_PREFIX}`, '').replace(':concurrency', '');
            const concurrency = parseInt(raw, 10);
            if (!isNaN(concurrency)) {
              loaded.push(`${vendorId}=${concurrency}`);
            }
          }
        }
      }
      this.logger.log(`Loaded ${loaded.length} persisted vendor concurrency config(s): ${loaded.join(', ')}`);
    } catch (err) {
      this.logger.warn('Failed to load persisted vendor configs: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  private async getConfiguredConcurrency(vendorId: string): Promise<number> {
    try {
      const raw = await this.redis.get(this.concurrencyKey(vendorId));
      if (raw !== null) {
        const concurrency = parseInt(raw, 10);
        if (!isNaN(concurrency) && concurrency > 0) {
          return Math.min(concurrency, this.maxConcurrencyPerVendor);
        }
      }
    } catch {
      // Redis unavailable — fall through to default
    }
    return this.defaultConcurrency;
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

    const effectiveConcurrency = Math.min(
      concurrency ?? (await this.getConfiguredConcurrency(vendorId)),
      this.maxConcurrencyPerVendor,
    );

    const queueName = this.getQueueName(vendorId);
    this.logger.log(
      'Creating queue for vendor: ' + vendorId + ' with concurrency: ' + effectiveConcurrency,
    );

    const redisOpts = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    };

    const queue = new Queue<VendorQueueJobData>(queueName, {
      connection: redisOpts,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    });

    const queueEvents = new QueueEvents(queueName, { connection: redisOpts });

    this.vendorQueues.set(vendorId, queue);
    this.vendorQueueEvents.set(vendorId, queueEvents);

    this.logger.log(
      'Vendor queue created: ' + queueName + ' (concurrency: ' + effectiveConcurrency + ')',
    );

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
      backoff: { type: 'exponential' as const, delay: options?.backoffDelay || 1000 },
      removeOnComplete: 100,
      removeOnFail: 1000,
    };

    await queue.add('vendor-sync', data, {
      ...jobOptions,
      jobId: data.jobId,
    });

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
      backoff: { type: 'exponential', delay: Math.min(1000 * Math.pow(2, retryCount), 60000) },
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

  /**
   * Persists vendor concurrency to Redis so it survives service restarts.
   */
  async configureVendorConcurrency(vendorId: string, concurrency: number): Promise<void> {
    const effective = Math.min(concurrency, this.maxConcurrencyPerVendor);

    try {
      await this.redis.set(this.concurrencyKey(vendorId), effective.toString(), 'EX', 86400 * 30);
      this.logger.log(
        'Vendor concurrency persisted to Redis: ' + vendorId + ' = ' + effective,
        VendorQueueService.name,
      );
    } catch (err) {
      this.logger.warn(
        'Failed to persist vendor concurrency to Redis (continuing in-memory): ' +
        (err instanceof Error ? err.message : String(err)),
        VendorQueueService.name,
      );
    }

    if (this.vendorQueues.has(vendorId)) {
      this.logger.log(
        'Concurrency for vendor ' + vendorId + ' updated to ' + effective + ' (will apply to new jobs)',
        VendorQueueService.name,
      );
    }
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
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { vendorId, queueName: this.getQueueName(vendorId), waiting, active, completed, failed, delayed };
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
    const stats = [];
    for (const [vendorId] of this.vendorQueues.entries()) {
      const stat = await this.getQueueStats(vendorId);
      if (stat) stats.push(stat);
    }
    return stats;
  }
}