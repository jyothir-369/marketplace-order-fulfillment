import { ConfigService } from '@nestjs/config';
import { ConnectionOptions } from 'bullmq';

export function getBullMQConnectionOptions(
  configService: ConfigService,
): ConnectionOptions {
  const redisUrl = configService.get<string>('REDIS_URL');

  let connection: ConnectionOptions;

  if (redisUrl) {
    const parsed = new URL(redisUrl);

    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') {
      throw new Error('REDIS_URL must use redis:// or rediss://');
    }

    connection = {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      ...(parsed.password
        ? { password: decodeURIComponent(parsed.password) }
        : {}),
      ...(parsed.username
        ? { username: decodeURIComponent(parsed.username) }
        : {}),
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  } else {
    const tlsEnabled =
      configService.get<string>('REDIS_TLS', 'false').toLowerCase() === 'true';

    connection = {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: Number(configService.get('REDIS_PORT', 6379)),
      password: configService.get('REDIS_PASSWORD') || undefined,
      ...(tlsEnabled ? { tls: {} } : {}),
    };
  }

  return {
    ...connection,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  };
}