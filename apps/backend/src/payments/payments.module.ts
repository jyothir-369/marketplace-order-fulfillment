import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentAuthorization } from '../common/entities/payment-authorization.entity';
import { AuditModule } from '../common/audit';
import { PaymentsService } from './payments.service';
import { MockPaymentService } from './mock-payment.service';

/**
 * PaymentsModule (Phase 5.1).
 *
 * Exposes `PaymentsService` to the orders module (checkout authorization +
 * cancellation refund) and the `MockPaymentService` seam. No controller — the
 * refund surface lives on `POST /orders/:id/refund` alongside the other order
 * actions.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PaymentAuthorization]), AuditModule],
  providers: [PaymentsService, MockPaymentService],
  exports: [PaymentsService, MockPaymentService],
})
export class PaymentsModule {}
