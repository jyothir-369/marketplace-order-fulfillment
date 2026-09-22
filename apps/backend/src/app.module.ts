import * as path from 'path';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getBullMQConnectionOptions } from './common/config/redis-connection.factory';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { CatalogModule } from './catalog/catalog.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { LoggerModule } from 'nestjs-pino';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { AdminModule } from './admin/admin.module';
import { VendorMockModule } from './integrations/vendor-mock/vendor-mock.module';
import { AuditModule } from './common/audit/audit.module';
import { AuditLog } from './common/audit/audit-log.entity';
import { HealthModule } from './health/health.module';
import { Vendor } from './common/entities/vendor.entity';
import { Category } from './common/entities/category.entity';
import { Product } from './common/entities/product.entity';
import { Order } from './common/entities/order.entity';
import { OrderLineItem } from './common/entities/order-line-item.entity';
import { VendorSyncJob } from './common/entities/vendor-sync-job.entity';
import { User } from './common/entities/user.entity';
import { RefreshToken } from './common/entities/refresh-token.entity';
import { PaymentAuthorization } from './common/entities/payment-authorization.entity';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../../../.env'),
        '.env',
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        const isCloudDb = dbUrl && (dbUrl.includes('supabase.co') || dbUrl.includes('sslmode=require'));

        if (dbUrl && dbUrl.trim() !== '' && isCloudDb) {
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [Vendor, Category, Order, Product, OrderLineItem, VendorSyncJob, AuditLog, User, RefreshToken, PaymentAuthorization],
            // Phase 2.1: migrations own the schema — no more synchronize in any env.
            synchronize: false,
            logging: configService.get('NODE_ENV') === 'development',
            ssl: isCloudDb ? { rejectUnauthorized: false } : false,
          };
        }

        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'postgres'),
          database: configService.get('DB_DATABASE', 'marketplace'),
          // Fixed a latent drift: the fallback branch was missing Category from
          // entities, so `sync:true` would have silently dropped categories.
          entities: [Vendor, Category, Order, Product, OrderLineItem, VendorSyncJob, AuditLog, User, RefreshToken, PaymentAuthorization],
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
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}