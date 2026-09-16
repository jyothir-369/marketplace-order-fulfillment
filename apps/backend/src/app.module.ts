import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getBullMQConnectionOptions } from './common/config/redis-connection.factory';
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
import { Category } from './common/entities/category.entity';
import { Product } from './common/entities/product.entity';
import { Order } from './common/entities/order.entity';
import { OrderLineItem } from './common/entities/order-line-item.entity';
import { VendorSyncJob } from './common/entities/vendor-sync-job.entity';
import { User } from './common/entities/user.entity';
import { RefreshToken } from './common/entities/refresh-token.entity';
import { AuthModule } from './auth/auth.module';

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

        if (dbUrl && dbUrl.trim() !== '') {
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [Vendor, Category, Order, Product, OrderLineItem, VendorSyncJob, AuditLog, User, RefreshToken],
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
          entities: [Vendor, Category, Order, Product, OrderLineItem, VendorSyncJob, AuditLog, User, RefreshToken],
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
    AuthModule,
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