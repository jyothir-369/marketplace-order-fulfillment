import { VendorApplication } from '../vendor/vendor-application.entity';
import { Product } from '../common/entities/product.entity';

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminCustomersController } from './admin.customers.controller';
import { AdminService } from './admin.service';
import { Order } from '../common/entities/order.entity';
import { User } from '../common/entities/user.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { AuditModule, AuditLog } from '../common/audit';
import { OrdersModule } from '../orders/orders.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderLineItem, VendorSyncJob, AuditLog, User, Vendor, VendorApplication, Product]),
    AuditModule,
    AuthModule,
    OrdersModule,
    FulfillmentModule,
  ],
  controllers: [AdminController, AdminCustomersController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}