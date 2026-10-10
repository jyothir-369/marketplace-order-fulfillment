import { ConfigService } from '@nestjs/config';
import { ConnectionOptions } from 'bullmq';

/**
 * Single source of truth for BullMQ/ioredis connection options (Phase 1.3).
 *
 * Every Queue / QueueEvents / Worker in the app must be built from these
 * options so behaviour under Redis unavailability is consistent across the
 * legacy shared queue, per-vendor queues, and their workers: lazyConnect,
 * no request retries, and a bounded reconnect backoff that gives up after a
 * few attempts instead of hanging or crashing.
 */
export function getBullMQConnectionOptions(configService: ConfigService): ConnectionOptions {
  return {
    host: configService.get('REDIS_HOST', 'localhost'),
    port: configService.get('REDIS_PORT', 6379),
    password: configService.get('REDIS_PASSWORD') || undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  };
}