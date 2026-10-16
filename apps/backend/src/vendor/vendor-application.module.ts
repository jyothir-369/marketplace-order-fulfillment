import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorApplicationController } from './vendor-application.controller';
import { VendorApplicationService } from './vendor-application.service';
import { VendorApplication } from './vendor-application.entity';
import { User } from '../common/entities/user.entity';
import { Vendor } from '../common/entities/vendor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VendorApplication, User, Vendor])],
  controllers: [VendorApplicationController],
  providers: [VendorApplicationService],
  exports: [VendorApplicationService],
})
export class VendorApplicationModule {}
