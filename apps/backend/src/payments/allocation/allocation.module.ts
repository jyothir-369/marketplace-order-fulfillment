import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorPaymentAllocation } from '../../common/entities/vendor-payment-allocation.entity';
import { AllocationService } from './allocation.service';

@Module({
  imports: [TypeOrmModule.forFeature([VendorPaymentAllocation])],
  providers: [AllocationService],
  exports: [AllocationService],
})
export class AllocationModule {}
