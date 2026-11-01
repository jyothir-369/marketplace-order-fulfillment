import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorApplicationController } from './vendor-application.controller';
import { VendorPaymentsController } from './payments/vendor-payments.controller';
import { VendorPayoutsService } from './payments/vendor-payouts.service';
import { VendorApplicationService } from './vendor-application.service';
import { VendorApplication } from './vendor-application.entity';
import { User } from '../common/entities/user.entity';
import { Vendor } from '../common/entities/vendor.entity';
import { VendorPaymentAllocation } from '../common/entities/vendor-payment-allocation.entity';
import { VendorPaymentAccount } from '../common/entities/vendor-payment-account.entity';
import { PaymentTransfer } from '../common/entities/payment-transfer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VendorApplication, User, Vendor, VendorPaymentAllocation, VendorPaymentAccount, PaymentTransfer,
    ]),
  ],
  controllers: [VendorApplicationController, VendorPaymentsController],
  providers: [VendorApplicationService, VendorPayoutsService],
  exports: [VendorApplicationService, VendorPayoutsService],
})
export class VendorModule {}
