import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import Razorpay from 'razorpay';
import { RazorpayProviderService } from './razorpay-provider.service';

const mockCreateOrder = jest.fn();
const mockFetchPayment = jest.fn();

jest.mock('razorpay', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    orders: { create: mockCreateOrder },
    payments: { fetch: mockFetchPayment },
  })),
}));

describe('RazorpayProviderService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_MODE = 'test';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_unit_key';
    process.env.RAZORPAY_KEY_SECRET = 'unit-test-key-secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook-secret';
  });

  afterAll(() => {
    for (const key of [
      'RAZORPAY_MODE',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
    ]) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it('refuses to operate outside test mode', async () => {
    process.env.RAZORPAY_MODE = 'live';
    const service = new RazorpayProviderService();

    await expect(
      service.createOrder(1250, 'receipt-123'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(Razorpay).not.toHaveBeenCalled();
  });

  it('refuses placeholder credentials', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'replace-with-test-key-secret';
    const service = new RazorpayProviderService();

    await expect(
      service.createOrder(1250, 'receipt-123'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('creates a server-side INR order using integer paise', async () => {
    mockCreateOrder.mockResolvedValue({
      id: 'order_test_123',
      amount: 1250,
      currency: 'INR',
      status: 'created',
      receipt: 'receipt-123',
    });

    const service = new RazorpayProviderService();
    await expect(
      service.createOrder(1250, 'receipt-123', { source: 'test' }),
    ).resolves.toEqual({
      id: 'order_test_123',
      amount: 1250,
      currency: 'INR',
      status: 'created',
      receipt: 'receipt-123',
    });

    expect(mockCreateOrder).toHaveBeenCalledWith({
      amount: 1250,
      currency: 'INR',
      receipt: 'receipt-123',
      partial_payment: false,
      notes: { source: 'test' },
    });
  });

  it('rejects non-integer or non-positive amounts', async () => {
    const service = new RazorpayProviderService();

    await expect(service.createOrder(0, 'receipt-123'))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createOrder(10.5, 'receipt-123'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('verifies a payment signature and rejects a tampered signature', () => {
    const service = new RazorpayProviderService();
    const signature = createHmac('sha256', 'unit-test-key-secret')
      .update('order_test_123|pay_test_123')
      .digest('hex');

    expect(
      service.verifyPaymentSignature(
        'order_test_123',
        'pay_test_123',
        signature,
      ),
    ).toBe(true);
    expect(
      service.verifyPaymentSignature(
        'order_test_123',
        'pay_test_123',
        '0'.repeat(64),
      ),
    ).toBe(false);
  });

  it('only accepts a captured payment matching order and amount', async () => {
    mockFetchPayment.mockResolvedValue({
      id: 'pay_test_123',
      order_id: 'order_test_123',
      amount: 1250,
      currency: 'INR',
      status: 'captured',
      captured: true,
    });

    const service = new RazorpayProviderService();

    await expect(
      service.verifyCapturedPayment('pay_test_123', 'order_test_123', 1250),
    ).resolves.toBe(true);
    await expect(
      service.verifyCapturedPayment('pay_test_123', 'order_test_other', 1250),
    ).resolves.toBe(false);
    await expect(
      service.verifyCapturedPayment('pay_test_123', 'order_test_123', 1251),
    ).resolves.toBe(false);
  });

  it('verifies webhook signatures using the raw body', () => {
    const body = '{"event":"payment.captured"}';
    const signature = createHmac('sha256', 'unit-test-webhook-secret')
      .update(body)
      .digest('hex');

    const service = new RazorpayProviderService();

    expect(service.verifyWebhookSignature(body, signature)).toBe(true);
    expect(service.verifyWebhookSignature(body, '0'.repeat(64))).toBe(false);
  });
});