import * as path from 'path';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getBullMQConnectionOptions } from './common/config/redis-connection.factory';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CatalogModule } from './catalog/catalog.module';
import { VendorApplicationModule } from './vendor/vendor-application.module';
import { VendorPromotionsModule } from './vendor/vendor-promotions.module';
import { VendorSettingsModule } from './vendor/vendor-settings.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggerModule } from 'nestjs-pino';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { AdminModule } from './admin/admin.module';
import { VendorMockModule } from './integrations/vendor-mock/vendor-mock.module';
import { VendorPaymentAccountsModule } from './vendor/payment-accounts/module/vendor-payment-accounts.module';
import { AuditModule } from './common/audit/audit.module';
import { AuditLog } from './common/audit/audit-log.entity';
import { HealthModule } from './health/health.module';
import { VendorPaymentAccount } from './common/entities/vendor-payment-account.entity';
import { VendorPaymentAllocation } from './common/entities/vendor-payment-allocation.entity';
import { PaymentTransfer } from './common/entities/payment-transfer.entity';
import { Vendor } from './common/entities/vendor.entity';
import { Category } from './common/entities/category.entity';
import { Product } from './common/entities/product.entity';
import { Review } from './common/entities/review.entity';
import { Order } from './common/entities/order.entity';
import { OrderLineItem } from './common/entities/order-line-item.entity';
import { VendorSyncJob } from './common/entities/vendor-sync-job.entity';
import { User } from './common/entities/user.entity';
import { RefreshToken } from './common/entities/refresh-token.entity';
import { PasswordResetToken } from './common/entities/password-reset-token.entity';
import { PaymentAuthorization } from './common/entities/payment-authorization.entity';
import { WebhookEvent } from './common/entities/webhook-event.entity';
import { CustomerAddress } from './customer/customer-address.entity';
import { VendorApplication } from './vendor/vendor-application.entity';
import { Promotion } from './common/entities/promotion.entity';
import { Refund } from './common/entities/refund.entity';
import { Dispute } from './common/entities/dispute.entity';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '.env.local'),
        path.resolve(__dirname, '../../../.env'),
        '.env',
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Explicit mode selection — the single source of truth for which
        // database configuration wins. Local mode always forces the local
        // compose DB; Supabase mode requires DATABASE_URL and never falls
        // back to local PostgreSQL.
        const dbMode = (configService.get<string>('DATABASE_MODE') || 'local').trim();
        if (dbMode !== 'local' && dbMode !== 'supabase') {
          throw new Error(
            'BLOCKED: invalid DATABASE_MODE (' + dbMode + '). Expected "local" or "supabase".'
          );
        }

        const dbUrl = (configService.get<string>('DATABASE_URL') || '').trim();
        const isCloudDb =
          dbUrl !== '' &&
          (dbUrl.includes('supabase') || dbUrl.includes('pooler') || dbUrl.includes('sslmode=require') || dbUrl.includes('.co'));

        if (dbMode === 'supabase') {
          if (!dbUrl || !isCloudDb) {
            throw new Error(
              'BLOCKED: DATABASE_MODE=supabase selected but DATABASE_URL is missing or invalid. ' +
                'Provide DATABASE_URL with supabase/pooler/sslmode or switch to DATABASE_MODE=local.'
            );
          }
          // Never fall back to local PostgreSQL when Supabase mode is selected.
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [Vendor, VendorPaymentAccount, VendorPaymentAllocation, PaymentTransfer, Category, Order, Product, OrderLineItem, VendorSyncJob, AuditLog, User, RefreshToken, PasswordResetToken, PaymentAuthorization, Review, WebhookEvent, CustomerAddress, VendorApplication, Promotion, Refund, Dispute],
            synchronize: false,
            logging: configService.get('NODE_ENV') === 'development',
            ssl: isCloudDb ? { rejectUnauthorized: false } : false,
          };
        }

        // Local mode: never fall back to a Supabase URL from another file.
        if (dbUrl && isCloudDb && dbMode === 'local') {
          throw new Error(
            'BLOCKED: DATABASE_MODE=local selected but DATABASE_URL contains a cloud endpoint. ' +
              'Clear DATABASE_URL or set DATABASE_MODE=supabase.'
          );
        }

        if (dbUrl && dbUrl.trim() !== '' && isCloudDb) {
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [Vendor, VendorPaymentAccount, VendorPaymentAllocation, PaymentTransfer, Category, Order, Product, OrderLineItem, VendorSyncJob, AuditLog, User, RefreshToken, PasswordResetToken, PaymentAuthorization, Review, WebhookEvent, CustomerAddress, VendorApplication, Promotion, Refund, Dispute],
            // Phase 2.1: migrations own the schema — no more synchronize in any env.
            synchronize: false,
            logging: configService.get('NODE_ENV') === 'development',
            ssl: isCloudDb ? { rejectUnauthorized: false } : false,
          };
        }

        // Guard: if DATABASE_URL is empty but DB_HOST points at a production
        // cloud endpoint, refuse to silently fall back to localhost defaults.
        const dbHost = configService.get('DB_HOST') || 'localhost';
        const isCloudHost =
          dbHost.includes('supabase') || dbHost.includes('pooler') || dbHost.includes('.supabase.co') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(dbHost);
        if (!dbUrl && isCloudHost) {
          throw new Error(
            'BLOCKED: DATABASE_URL is empty but DB_HOST points at a cloud/remote endpoint (' +
            dbHost +
            '). Either set DATABASE_URL for cloud or keep DB_HOST=localhost for local development.'
          );
        }

        return {
          type: 'postgres',
          host: dbHost,
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'postgres'),
          database: configService.get('DB_DATABASE', 'marketplace'),
          // Fixed a latent drift: the fallback branch was missing Category from
          // entities, so `sync:true` would have silently dropped categories.
          entities: [Vendor, VendorPaymentAccount, VendorPaymentAllocation, PaymentTransfer, Category, Order, Product, OrderLineItem, VendorSyncJob, AuditLog, User, RefreshToken, PasswordResetToken, PaymentAuthorization, Review, WebhookEvent, CustomerAddress, VendorApplication, Promotion, Refund, Dispute],
          synchronize: false,
          logging: configService.get('NODE_ENV') === 'development',
          ssl: false,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          connection: getBullMQConnectionOptions(configService),
        };
      },
      inject: [ConfigService],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          // Use request correlation ID from our decorator
          genReqId: (request) => request['correlationId'] || undefined,
          // Custom properties to add correlation ID to logs
          customProps: (req, res) => ({
            correlationId: req['correlationId'] || 'N/A'
          }),
          // Log level based on environment
          level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
          // Disable in test environment to avoid noise
          ...(process.env.NODE_ENV === 'test' ? { enabled: false } : {}),
          // Pretty print in development
          transport: process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
          // Auto-logging for requests/responses
          autoLogging: true,
        },
      }),
    }),
    AuthModule,
    AuditModule,
    VendorMockModule,
    CatalogModule,
    VendorApplicationModule,
    VendorPaymentAccountsModule,
    VendorPromotionsModule,
    VendorSettingsModule,
    InventoryModule,
    OrdersModule,
    FulfillmentModule,
    PaymentsModule,
    AdminModule,
    HealthModule,
    // Phase 6.1: global rate limiting. The default 100 req/60s covers every
    // route; the abuse-sensitive auth + checkout routes get a tighter
    // per-method limit via @Throttle on the controller methods.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
