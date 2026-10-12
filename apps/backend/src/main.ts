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

/**
 * CORS configuration.
 *
 * Allowed browser origins come from three places:
 *  1. Fixed defaults below (local development + stable production domain).
 *  2. The optional CORS_ORIGINS environment variable (comma-separated),
 *     e.g. CORS_ORIGINS=https://my-domain.com,https://www.my-domain.com
 *  3. Vercel per-deployment / preview URLs of THIS project, matched by
 *     pattern, because Vercel generates a new random URL on every deploy.
 *
 * Set CORS_ALLOW_VERCEL_DEPLOYMENTS=false on Render to disable (3) and
 * accept only the explicit origins from (1) and (2).
 */
const DEFAULT_ALLOWED_ORIGINS: string[] = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',

  // Stable Vercel production domain (always points at the latest deploy).
  'https://marketplace-order-fulfillment-front.vercel.app',
];

const VERCEL_DEPLOYMENT_PATTERNS: RegExp[] = [
  // Per-deployment URL, short form:
  //   https://marketplace-order-fulfillment-frontend-8fq8zg8ga.vercel.app
  /^https:\/\/marketplace-order-fulfillment-frontend-[a-z0-9]{9}\.vercel\.app$/,

  // Deployment / branch preview URLs that end with this Vercel team slug.
  // The team slug makes these impossible for other accounts to imitate:
  //   https://marketplace-order-fulfillment-frontend-<hash>-<team>.vercel.app
  //   https://marketplace-order-git-<branch>-<team>.vercel.app
  /^https:\/\/marketplace-order-[a-z0-9-]+-jyothir-raghavalu-bhogis-projects\.vercel\.app$/,
];

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

function buildAllowedOrigins(): Set<string> {
  const fromEnv = (process.env.CORS_ORIGINS ?? '').split(',');

  return new Set(
    [...DEFAULT_ALLOWED_ORIGINS, ...fromEnv]
      .map(normalizeOrigin)
      .filter((origin) => origin.length > 0),
  );
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const corsLogger = new Logger('CORS');

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

  const allowedOrigins = buildAllowedOrigins();
  const allowVercelDeployments =
    (process.env.CORS_ALLOW_VERCEL_DEPLOYMENTS ?? 'true').toLowerCase() !==
    'false';

  // Remember blocked origins so each one is logged only once.
  const warnedOrigins = new Set<string>();

  const isAllowedOrigin = (origin: string): boolean => {
    const normalized = normalizeOrigin(origin);

    if (allowedOrigins.has(normalized)) {
      return true;
    }

    return (
      allowVercelDeployments &&
      VERCEL_DEPLOYMENT_PATTERNS.some((pattern) => pattern.test(normalized))
    );
  };

  corsLogger.log(
    `Allowed origins: ${[...allowedOrigins].join(', ')} ` +
      `(Vercel deployment URLs ${allowVercelDeployments ? 'allowed' : 'blocked'})`,
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server
      // requests and health checks. This does not enable browser CORS access.
      if (!origin) {
        return callback(null, true);
      }

      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      if (!warnedOrigins.has(origin)) {
        warnedOrigins.add(origin);
        corsLogger.warn(
          `Blocked origin: ${origin}. Add it to CORS_ORIGINS if it should be allowed.`,
        );
      }

      // Reject unlisted browser origins without throwing a server error.
      return callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    // allowedHeaders is intentionally omitted: the cors middleware then
    // reflects whatever headers the browser asks for in its preflight, so a
    // new custom request header can never break the API with a CORS error.
    credentials: true,
    maxAge: 86400,
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
