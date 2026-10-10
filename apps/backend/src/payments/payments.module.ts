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
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentAuthorization,
      Order,
      OrderLineItem,
      Product,
      WebhookEvent,
    ]),
    AuditModule,
    InventoryModule,
  ],
  controllers: [
    RazorpayInitiationController,
    RazorpayVerificationController,
    RazorpayWebhookController,
  ],
  providers: [
    PaymentsService,
    MockPaymentService,
    RazorpayProviderService,
    RazorpayInitiationService,
    RazorpayVerificationService,
    CheckoutReconciliationService,
  ],
  exports: [
    PaymentsService,
    MockPaymentService,
    RazorpayProviderService,
    RazorpayInitiationService,
    RazorpayVerificationService,
    CheckoutReconciliationService,
  ],
})
export class PaymentsModule {}