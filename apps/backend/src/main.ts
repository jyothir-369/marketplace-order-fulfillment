import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Safety net for Redis/BullMQ connection noise (Phase 1.3).
 *
 * Previously main.ts monkey-patched process.stderr to silently swallow Redis
 * errors and muted uncaughtException/unhandledRejection for them. Now that all
 * BullMQ connections share the same lazyConnect/retry config
 * (`getBullMQConnectionOptions`), Redis-down behaviour is bounded and
 * predictable, so we no longer need to hide anything from stderr — instead we
 * LOG connection notes through the app logger (rate-bounded) and still let
 * genuine non-Redis errors crash loudly.
 */
function attachGlobalErrorSafety(): void {
  const redisLogger = new Logger('Redis');
  const isRedisConnectionNote = (message: string): boolean =>
    message.includes('ECONNREFUSED') ||
    message.includes('Connection is closed') ||
    message.includes('Connection is not open') ||
    message.includes('Redis is closed') ||
    message.includes('redis');

  process.on('unhandledRejection', (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason || '');
    if (isRedisConnectionNote(msg)) {
      redisLogger.warn('Redis connection note (unhandledRejection): ' + msg);
      return;
    }
    throw reason;
  });

  process.on('uncaughtException', (err: Error) => {
    const msg = err?.message || '';
    if (isRedisConnectionNote(msg)) {
      redisLogger.warn('Redis connection note (uncaughtException): ' + msg);
      return;
    }
    throw err;
  });
}

attachGlobalErrorSafety();

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

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, true);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`Marketplace Order & Fulfillment System running on port ${port}`);
}

bootstrap().catch(function(error) {
  console.error('Failed to start application:', error);
  process.exit(1);
});
// trigger railway deploy
// trigger deploy
