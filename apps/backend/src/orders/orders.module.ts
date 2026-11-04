import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionCheckoutSnapshot } from '../payments/snapshot/promotion-checkout-snapshot.entity';
import { PromotionCheckoutSnapshotService } from '../payments/snapshot/promotion-checkout-snapshot.service';
import { CategoryBCalcService } from '../payments/category-b/category-b-calc.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { Promotion } from '../common/entities/promotion.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../common/audit';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromotionCheckoutSnapshot,Order, OrderLineItem, Product, Vendor, Promotion]),
    InventoryModule,
    AuditModule,
    PaymentsModule,
  ],
  controllers: [OrdersController],
  providers: [
    CategoryBCalcService,
    PromotionCheckoutSnapshotService,OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
