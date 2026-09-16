import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Product } from '../common/entities/product.entity';
import { Category } from '../common/entities/category.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';

@Module({
  // OrderLineItem + Order power the Phase 1.5 vendor detail/dashboard metrics.
  imports: [TypeOrmModule.forFeature([Product, Category, Vendor, Order, OrderLineItem])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}