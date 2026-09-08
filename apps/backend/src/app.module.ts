import * as path from 'path';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { AdminModule } from './admin/admin.module';
import { VendorMockModule } from './integrations/vendor-mock/vendor-mock.module';
import { AuditModule } from './common/audit/audit.module';
import { AuditLog } from './common/audit/audit-log.entity';
import { HealthModule } from './health/health.module';
import { Vendor } from './common/entities/vendor.entity';
import { Product } from './common/entities/product.entity';
import { Order } from './common/entities/order.entity';
import { OrderLineItem } from './common/entities/order-line-item.entity';
import { VendorSyncJob } from './common/entities/vendor-sync-job.entity';

const logger = new Logger('BullModule');

function parsePostgresUrl(url: string): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    return null;
  }
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [path.resolve(__dirname, '../../../.env'), '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: function(configService) {
        const databaseUrl = configService.get('DATABASE_URL') as string | undefined;
        const parsed = databaseUrl ? parsePostgresUrl(databaseUrl) : null;
        return {
          type: 'postgres',
          host: parsed?.host ?? configService.get('DB_HOST', 'localhost'),
          port: parsed?.port ?? Number(configService.get('DB_PORT', 5432)),
          username: parsed?.username ?? configService.get('DB_USERNAME', 'postgres'),
          password: parsed?.password ?? configService.get('DB_PASSWORD', 'postgres'),
          database: parsed?.database ?? configService.get('DB_DATABASE', 'marketplace'),
          entities: [Vendor, Order, Product, OrderLineItem, VendorSyncJob, AuditLog],
          synchronize: configService.get('NODE_ENV') !== 'production',
          logging: configService.get('NODE_ENV') === 'development',
          ...(parsed
            ? {
                ssl: databaseUrl?.includes('sslmode=no-verify') ||
                  databaseUrl?.includes('sslmode=require')
                  ? { rejectUnauthorized: false }
                  : databaseUrl?.includes('sslmode=disable')
                    ? false
                    : { rejectUnauthorized: false },
              }
            : {}),
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: function(configService) {
        return {
          // maxRetriesPerRequest: null — required for graceful degradation when Redis
          // is unavailable. With this setting, BullMQ stops retrying on connection
          // failure and the NestJS app starts normally; queue operations will fail
          // at runtime instead of crashing the bootstrap.
          // enableOfflineQueue: false — prevents BullMQ from silently buffering
          // jobs in memory when Redis is unreachable.
          connection: {
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
          },
        };
      },
      inject: [ConfigService],
    }),
    AuditModule,
    VendorMockModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    FulfillmentModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
