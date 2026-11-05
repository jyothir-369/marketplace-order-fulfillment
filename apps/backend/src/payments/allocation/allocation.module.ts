import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorPaymentAllocation } from '../../common/entities/vendor-payment-allocation.entity';
import { AllocationService } from './allocation.service';
import { DurableAllocationService } from './durable-allocation.service';
import { AllocationRepo } from './allocation-repo.repository';

@Module({
  imports: [TypeOrmModule.forFeature([VendorPaymentAllocation])],
  providers: [
    AllocationService,
    DurableAllocationService,
    AllocationRepo,
  ],
  exports: [AllocationService, DurableAllocationService, AllocationRepo],
})
export class AllocationModule {}
