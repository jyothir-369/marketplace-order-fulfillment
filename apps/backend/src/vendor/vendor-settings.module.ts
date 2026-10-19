import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from '../common/entities/vendor.entity';
import { VendorSettingsController } from './vendor-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor])],
  controllers: [VendorSettingsController],
  providers: [],
})
export class VendorSettingsModule {}
