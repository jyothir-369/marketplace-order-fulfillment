import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentAuthorization } from '../common/entities/payment-authorization.entity';
import { Order } from '../common/entities/order.entity';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { WebhookEvent } from '../common/entities/webhook-event.entity';
import { AuditModule } from '../common/audit';
import { PaymentsService } from './payments.service';
import { MockPaymentService } from './mock-payment.service';
import { RazorpayProviderService } from './razorpay-provider.service';
import { RazorpayInitiationService } from './razorpay-initiation.service';
import { RazorpayVerificationService } from './razorpay-verification.service';
import { RazorpayInitiationController } from './razorpay-initiation.controller';
import { RazorpayVerificationController } from './razorpay-verification.controller';
import { CheckoutReconciliationService } from './checkout-reconciliation.service';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { VendorPaymentsController } from '../vendor/payments/vendor-payments.controller';
import { VendorPaymentAllocation } from '../common/entities/vendor-payment-allocation.entity';
import { PaymentTransfer } from '../common/entities/payment-transfer.entity';
import { VendorPaymentAccount } from '../common/entities/vendor-payment-account.entity';
import { Refund } from '../common/entities/refund.entity';
import { Dispute } from '../common/entities/dispute.entity';
import { RefundService } from './refund/refund.service';
import { AdminPaymentsService } from '../admin/payments/admin-payments.service';
import { VendorPayoutsService } from '../vendor/payments/vendor-payouts.service';

import { AllocationModule } from './allocation/allocation.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentAuthorization,
      Order,
      OrderLineItem,
      Product,
      WebhookEvent,
      VendorPaymentAllocation,
      PaymentTransfer,
      VendorPaymentAccount,
      Refund,
      Dispute,
    ]),
    AuditModule,
    AllocationModule,
    InventoryModule,
  ],
  controllers: [
    RazorpayInitiationController,
    RazorpayVerificationController,
    RazorpayWebhookController,
    VendorPaymentsController,
  ],
  providers: [
    PaymentsService,
    MockPaymentService,
    RazorpayProviderService,
    RazorpayInitiationService,
    RazorpayVerificationService,
    CheckoutReconciliationService,
    RefundService,
    AdminPaymentsService,
    VendorPayoutsService,
  ],
  exports: [
    AdminPaymentsService,
    PaymentsService,
    MockPaymentService,
    RazorpayProviderService,
    RazorpayInitiationService,
    RazorpayVerificationService,
    CheckoutReconciliationService,
  ],
})
export class PaymentsModule {}