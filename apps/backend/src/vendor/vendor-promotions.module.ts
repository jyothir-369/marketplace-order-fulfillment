import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from '../common/entities/promotion.entity';
import { VendorPromotionsController } from './vendor-promotions.controller';
import { VendorPromotionsService } from './vendor-promotions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion])],
  controllers: [VendorPromotionsController],
  providers: [VendorPromotionsService],
  exports: [VendorPromotionsService],
})
export class VendorPromotionsModule {}
