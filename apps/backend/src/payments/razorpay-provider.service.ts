import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string | null;
}

@Injectable()
export class RazorpayProviderService {
  private client: Razorpay | null = null;

  private assertTestMode(): void {
    if (process.env.RAZORPAY_MODE !== 'test') {
      throw new ServiceUnavailableException(
        'Razorpay is disabled unless RAZORPAY_MODE is test.',
      );
    }
  }

  private getCredentials(): { keyId: string; keySecret: string } {
    this.assertTestMode();

    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (
      !keyId ||
      !keyId.startsWith('rzp_test_') ||
      !keySecret ||
      /replace|placeholder|your[_ -]?key|change[_ -]?me/i.test(keySecret)
    ) {
      throw new ServiceUnavailableException(
        'Valid Razorpay test credentials are not configured.',
      );
    }

    return { keyId, keySecret };
  }

  private getClient(): Razorpay {
    const credentials = this.getCredentials();

    if (!this.client) {
      this.client = new Razorpay({
        key_id: credentials.keyId,
        key_secret: credentials.keySecret,
      });
    }

    return this.client;
  }

  /** Safe to send to the browser; never expose RAZORPAY_KEY_SECRET. */
  getPublicKeyId(): string {
    return this.getCredentials().keyId;
  }

  /** Amount must be computed by the backend and expressed in paise. */
  async createOrder(
    amountPaise: number,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<RazorpayOrderResult> {
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException(
        'Payment amount must be a positive integer number of paise.',
      );
    }

    if (!receipt?.trim() || receipt.length > 40) {
      throw new BadRequestException(
        'Receipt must contain between 1 and 40 characters.',
      );
    }

    const created = await this.getClient().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      partial_payment: false,
      ...(notes ? { notes } : {}),
    });

    return {
      id: created.id,
      amount: Number(created.amount),
      currency: created.currency,
      status: created.status,
      receipt: created.receipt ?? null,
    };
  }

  /** Verify checkout's order_id|payment_id signature on the server. */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    if (
      !orderId ||
      !paymentId ||
      !/^[a-f0-9]{64}$/i.test(signature || '')
    ) {
      return false;
    }

    const { keySecret } = this.getCredentials();
    const expected = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`, 'utf8')
      .digest();

    return this.safeHexSignatureEqual(expected, signature);
  }

  /**
   * Check the provider's actual payment resource.
   * A valid checkout signature alone does not establish that a payment
   * has reached captured status for the expected order and amount.
   */
  async verifyCapturedPayment(
    paymentId: string,
    expectedOrderId: string,
    expectedAmountPaise: number,
  ): Promise<boolean> {
    if (
      !paymentId ||
      !expectedOrderId ||
      !Number.isSafeInteger(expectedAmountPaise) ||
      expectedAmountPaise <= 0
    ) {
      return false;
    }

    const payment = await this.getClient().payments.fetch(paymentId);

    return (
      payment.id === paymentId &&
      payment.order_id === expectedOrderId &&
      Number(payment.amount) === expectedAmountPaise &&
      payment.currency === 'INR' &&
      payment.status === 'captured' &&
      payment.captured === true
    );
  }

  /** Verify the webhook HMAC against the exact raw request body. */
  verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string,
  ): boolean {
    this.assertTestMode();

    if (!/^[a-f0-9]{64}$/i.test(signature || '')) {
      return false;
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

    if (
      !webhookSecret ||
      /replace|placeholder|your[_ -]?secret|change[_ -]?me/i.test(
        webhookSecret,
      )
    ) {
      throw new ServiceUnavailableException(
        'Razorpay test webhook secret is not configured.',
      );
    }

    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest();

    return this.safeHexSignatureEqual(expected, signature);
  }

  private safeHexSignatureEqual(
    expected: Buffer,
    suppliedHex: string,
  ): boolean {
    if (!/^[a-f0-9]{64}$/i.test(suppliedHex || '')) {
      return false;
    }

    const supplied = Buffer.from(suppliedHex, 'hex');

    return (
      supplied.length === expected.length &&
      timingSafeEqual(expected, supplied)
    );
  }
}