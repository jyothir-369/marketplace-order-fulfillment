import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Product } from '../common/entities/product.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Vendor, VendorSyncJob, OrderLineItem])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
