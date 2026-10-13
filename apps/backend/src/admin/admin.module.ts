import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Order } from '../common/entities/order.entity';
import { User } from '../common/entities/user.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { AuditModule, AuditLog } from '../common/audit';
import { OrdersModule } from '../orders/orders.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderLineItem, VendorSyncJob, AuditLog, User, Vendor]),
    AuditModule,
    OrdersModule,
    FulfillmentModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}