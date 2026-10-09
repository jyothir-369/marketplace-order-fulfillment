import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  PaymentAuthorization,
  PaymentStatus,
} from '../common/entities/payment-authorization.entity';
import { AuditService } from '../common/audit';
import { MockPaymentService, PaymentAuthorizationResult } from './mock-payment.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  private assertMockPaymentsAllowedInProduction(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        'Mock payment processing is disabled in production. Configure a real payment provider before accepting payments or issuing refunds.',
      );
    }
  }

  constructor(
    @InjectRepository(PaymentAuthorization)
    private readonly paymentRepository: Repository<PaymentAuthorization>,
    private readonly mockPaymentService: MockPaymentService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Delegate authorization to the mock provider. Called from checkout BEFORE
   * any inventory write so a decline aborts with nothing committed.
   */
  async authorize(
    amount: number,
    correlationId: string,
    paymentMethodToken?: string,
  ): Promise<PaymentAuthorizationResult> {
    this.assertMockPaymentsAllowedInProduction();
    return this.mockPaymentService.authorize(amount, correlationId, paymentMethodToken);
  }

  /**
   * Persist the successful authorization against the freshly-created order,
   * inside the caller's transaction. The mock provider settles immediately, so
   * the row is recorded as `captured`.
   */
  async recordCapture(
    manager: EntityManager,
    orderId: string,
    amount: number,
    authorization: PaymentAuthorizationResult,
    correlationId: string,
  ): Promise<PaymentAuthorization> {
    this.assertMockPaymentsAllowedInProduction();
    const repo = manager.getRepository(PaymentAuthorization);
    const payment = repo.create({
      orderId,
      amount,
      status: PaymentStatus.CAPTURED,
      provider: 'mock',
      providerReference: authorization.providerReference,
      correlationId,
      failureReason: null,
    });
    const saved = await repo.save(payment);

    await this.auditService.logPaymentAuthorized(
      correlationId,
      saved.id,
      orderId,
      amount,
      authorization.providerReference || undefined,
    );

    this.logger.log(
      'Payment captured for order ' + orderId + ' (' + amount + ') ref=' + (authorization.providerReference || 'N/A'),
      PaymentsService.name,
      correlationId,
    );
    return saved;
  }

  /**
   * Reverse the authorization for an order (Phase 5.1).
   *
   * Idempotent-friendly: a missing row (orders placed before payments existed)
   * is a no-op, and an already-refunded row is returned unchanged. Runs against
   * the caller's transaction when one is supplied so cancellation stays atomic.
   */
  async refund(
    orderId: string,
    correlationId: string,
    manager?: EntityManager,
  ): Promise<PaymentAuthorization | null> {
    const repo = manager ? manager.getRepository(PaymentAuthorization) : this.paymentRepository;

    const payment = await repo.findOne({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      this.logger.log(
        'No payment authorization for order ' + orderId + ' — nothing to refund',
        PaymentsService.name,
        correlationId,
      );
      return null;
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return payment;
    }
    this.assertMockPaymentsAllowedInProduction();

    await repo.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      failureReason: 'Refunded on order cancellation',
    });

    await this.auditService.logPaymentRefunded(correlationId, payment.id, orderId, Number(payment.amount));

    this.logger.log(
      'Payment refunded for order ' + orderId + ' ref=' + (payment.providerReference || 'N/A'),
      PaymentsService.name,
      correlationId,
    );

    return { ...payment, status: PaymentStatus.REFUNDED };
  }

  async findByOrderId(orderId: string): Promise<PaymentAuthorization[]> {
    return this.paymentRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async refundViaRazorpay(paymentId: string, amountPaise?: number): Promise<{ id: string; status: string }> {
    // Fail closed: no placeholder credentials; require validated provider credentials
    const { RazorpayProviderService } = require('./razorpay-provider.service');
    const provider = new RazorpayProviderService();
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret || /replace|placeholder|your[_ -]?key/i.test(keySecret) || !keyId.startsWith('rzp_test_')) {
      throw new Error('Valid Razorpay test credentials required for refund');
    }
    const client = new (require('razorpay'))({ key_id: keyId, key_secret: keySecret });
    return client.payments.refund(paymentId, { amount: amountPaise || 0, notes: { refund_type: 'full' } });
  }}
