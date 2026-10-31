import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorPaymentAllocation } from '../common/entities/vendor-payment-allocation.entity';
import { PaymentTransfer } from '../common/entities/payment-transfer.entity';
import { Refund } from '../common/entities/refund.entity';
import { Dispute } from '../common/entities/dispute.entity';
import { AdminPaymentsController } from './admin-payments.controller';

import { RefundService } from './refund/refund.service';

@Module({
  imports: [TypeOrmModule.forFeature([VendorPaymentAllocation, PaymentTransfer, Refund, Dispute])],
  controllers: [AdminPaymentsController],
  providers: [RefundService],
})
export class AdminPaymentsModule {}
