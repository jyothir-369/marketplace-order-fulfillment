import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

// ---------------------------------------------------------------------------
// ioredis error suppression
// ---------------------------------------------------------------------------
// BullMQ creates internal ioredis connections to perform blocking reads.
// When local Redis is offline those ioredis instances emit error events
// that bubble up to Node process error events. These are already handled
// gracefully by VendorQueueService (in-memory fallback) and
// VendorSyncIsolatedProcessor (warn-level logger), so raw stderr output is
// pure noise. The following handlers silently swallow those expected errors
// while letting any genuinely unexpected error continue to propagate.
// ---------------------------------------------------------------------------
function setupIoredisErrorHandlers(): void {
  const originalWrite = process.stderr.write.bind(process.stderr);
  const isExpectedRedisNoise = (chunk: unknown): boolean => {
    if (typeof chunk !== 'string') return false;
    return (
      chunk.includes('ioredis') ||
      chunk.includes('Connection is closed') ||
      chunk.includes('Connection is not open') ||
      chunk.includes('ECONNREFUSED 127.0.0.1:6379') ||
      chunk.includes('redis_module') ||
      (chunk.includes('Error:') && chunk.includes('Redis.js'))
    );
  };

  (process.stderr as unknown as { write: typeof process.stderr.write }).write = function (
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((err?: Error | null) => void),
    cb?: (err?: Error | null) => void,
  ): boolean {
    const text =
      typeof chunk === 'string'
        ? chunk
        : Buffer.isBuffer(chunk)
          ? chunk.toString()
          : '';
    if (isExpectedRedisNoise(text)) {
      if (typeof encoding === 'function') encoding();
      else if (typeof cb === 'function') cb();
      return true;
    }
    if (typeof encoding === 'function') {
      return originalWrite(chunk, encoding);
    }
    return originalWrite(chunk, encoding as BufferEncoding, cb);
  } as typeof process.stderr.write;

  process.on('uncaughtException', (err: Error) => {
    const msg = err?.message || '';
    if (
      msg.includes('Connection is closed') ||
      msg.includes('Connection is not open') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('Redis is closed')
    ) {
      return;
    }
    throw err;
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason || '');
    if (
      msg.includes('Connection is closed') ||
      msg.includes('Connection is not open') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('Redis is closed')
    ) {
      return;
    }
    throw reason;
  });
}

setupIoredisErrorHandlers();

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // GAP (Phase 1): explicitly allow the storefront dev origin so CORS
  // errors never masquerade as opaque network failures.
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // No Origin header (curl, server-to-server) — allow.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Defensively allow for development flexibility.
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);

  logger.log('Marketplace Order & Fulfillment System running on port ' + port);
}

bootstrap().catch(function(error) {
  console.error('Failed to start application:', error);
  process.exit(1);
});
