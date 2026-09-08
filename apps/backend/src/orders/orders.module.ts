import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../common/audit';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderLineItem, Product, Vendor]),
    InventoryModule,
    AuditModule,
    FulfillmentModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
