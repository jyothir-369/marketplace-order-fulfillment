
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

/**
 * Safety net for Redis/BullMQ connection noise.
 *
 * Log Redis connection notes without suppressing genuine application errors.
 */
function attachGlobalErrorSafety(): void {
  const redisLogger = new Logger('Redis');

  const isRedisConnectionNote = (message: string): boolean =>
    message.includes('ECONNREFUSED') ||
    message.includes('Connection is closed') ||
    message.includes('Connection is not open') ||
    message.includes('Redis is closed') ||
    message.toLowerCase().includes('redis');

  process.on('unhandledRejection', (reason: unknown) => {
    const msg =
      reason instanceof Error ? reason.message : String(reason || '');

    if (isRedisConnectionNote(msg)) {
      redisLogger.warn(
        'Redis connection note (unhandledRejection): ' + msg,
      );
      return;
    }

    throw reason;
  });

  process.on('uncaughtException', (err: Error) => {
    const msg = err?.message || '';

    if (isRedisConnectionNote(msg)) {
      redisLogger.warn(
        'Redis connection note (uncaughtException): ' + msg,
      );
      return;
    }

    throw err;
  });
}

attachGlobalErrorSafety();

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    {
      // Preserve original request bytes for webhook HMAC verification.
      rawBody: true,
      logger: ['error', 'warn', 'log', 'debug'],
    },
  );

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

  // Production and development frontend origins.
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',

    // Current Vercel production domain.
    'https://marketplace-order-fulfillment-front.vercel.app',
    // Vercel deployment currently reporting CORS errors.
    'https://marketplace-order-fulfillment-frontend-oberz36vs.vercel.app',

    // Existing Vercel deployment domains.
    'https://marketplace-order-fulfillment-frontend-b3aj4m0p8.vercel.app',
    'https://marketplace-order-fulfillment-frontend-4ybyxg41w.vercel.app',
    'https://marketplace-order-fulfillment-frontend-2cdwuacb9.vercel.app',

    // Current deployment aliases provided for this project.
    'https://marketplace-order-git-69db56-jyothir-raghavalu-bhogis-projects.vercel.app',
    'https://marketplace-order-fulfillment-frontend-n06vwx2v3.vercel.app',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server
      // requests and health checks. This does not enable browser CORS access.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      // Reject unlisted browser origins without throwing a server error.
      return callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  const port = Number(process.env.PORT) || 3001;

  await app.listen(port, '0.0.0.0');

  logger.log(
    `Marketplace Order & Fulfillment System running on port ${port}`,
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
