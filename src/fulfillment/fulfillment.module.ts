import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { FulfillmentController } from './fulfillment.controller';
import { FulfillmentService } from './fulfillment.service';
import { VendorSyncProcessor, VENDOR_SYNC_QUEUE } from './vendor-sync.processor';
import { VendorSyncIsolatedProcessor } from './vendor-sync-isolated.processor';
import { VendorQueueService } from './vendor-queue.service';
import { ReconciliationScheduler } from './reconciliation.scheduler';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { Order } from '../common/entities/order.entity';
import { AuditModule, AuditLog } from '../common/audit';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderLineItem, VendorSyncJob, Order, AuditLog]),
    BullModule.registerQueue({ name: VENDOR_SYNC_QUEUE }),
    BullModule.registerQueue({ name: 'vendor-sync-base' }),
    BullModule.registerQueue({ name: 'vendor-sync-isolated' }),
    ScheduleModule.forRoot(),
    AuditModule,
  ],
  controllers: [FulfillmentController],
  providers: [
    FulfillmentService,
    VendorSyncProcessor,
    VendorSyncIsolatedProcessor,
    VendorQueueService,
    ReconciliationScheduler,
  ],
  exports: [FulfillmentService, VendorQueueService],
})
export class FulfillmentModule {}