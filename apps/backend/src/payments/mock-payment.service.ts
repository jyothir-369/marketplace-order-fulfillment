import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus } from '../common/entities/payment-authorization.entity';

/** Test-token that always declines (mirrors the UI "Mock Card — Decline"). */
export const PAYMENT_DECLINE_TOKEN = 'mock-decline';
/** Test-token that always succeeds (mirrors the UI "Mock Card — Test Success"). */
export const PAYMENT_SUCCESS_TOKEN = 'mock-success';

export interface PaymentAuthorizationResult {
  success: boolean;
  status: PaymentStatus;
  providerReference: string | null;
  message: string;
}

/**
 * Mock payment provider (Phase 5.1).
 *
 * Deliberately does NOT talk to a real PSP — no card data, no network — but it
 * is the single seam a real provider would replace, and its success/decline
 * behaviour is driven the same way the other simulator in this codebase
 * (`vendor-mock.service.ts`) drives fulfilment: a configurable failure rate
 * plus an explicit forced response.
 *
 * Determinism note: `failureRate` defaults to **0**, so checkout is
 * deterministic unless a caller explicitly opts into simulated failures or
 * passes the decline token. Tests rely on this.
 */
@Injectable()
export class MockPaymentService {
  private readonly logger = new Logger(MockPaymentService.name);

  /** Fraction of authorizations declined when no token/forced response applies. */
  private failureRate = 0;
  /** When true, every authorization declines regardless of token. */
  private forcedDecline = false;

  /** Mirrors `VendorMockService.configureVendor` — a single seam for tests/ops. */
  configurePayment(options: { failureRate?: number; forcedDecline?: boolean }): void {
    if (options.failureRate !== undefined) {
      this.failureRate = Math.min(Math.max(options.failureRate, 0), 1);
    }
    if (options.forcedDecline !== undefined) {
      this.forcedDecline = options.forcedDecline;
    }
    this.logger.log(
      'Payment simulator configured (failureRate=' + this.failureRate + ', forcedDecline=' + this.forcedDecline + ')',
    );
  }

  /** Reset to the deterministic defaults (used by tests between cases). */
  reset(): void {
    this.failureRate = 0;
    this.forcedDecline = false;
  }

  async authorize(
    amount: number,
    correlationId: string,
    paymentMethodToken?: string,
  ): Promise<PaymentAuthorizationResult> {
    this.logger.log(
      'Authorizing mock payment of ' + amount + (paymentMethodToken ? ' (token: ' + paymentMethodToken + ')' : ''),
      MockPaymentService.name,
      correlationId,
    );

    // Simulate provider latency so callers exercise async behaviour.
    await this.sleep(25);

    if (this.forcedDecline || paymentMethodToken === PAYMENT_DECLINE_TOKEN) {
      return this.decline('Card declined by issuer (mock)');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return this.decline('Invalid payment amount: ' + amount);
    }

    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      return this.decline('Payment authorization failed (simulated)');
    }

    return {
      success: true,
      status: PaymentStatus.AUTHORIZED,
      // Reusing the 'PAY-' + uuid convention from the vendor simulator.
      providerReference: 'PAY-' + uuidv4().substring(0, 8).toUpperCase(),
      message: 'Authorization approved',
    };
  }

  private decline(message: string): PaymentAuthorizationResult {
    return {
      success: false,
      status: PaymentStatus.FAILED,
      providerReference: null,
      message: message,
    };
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
