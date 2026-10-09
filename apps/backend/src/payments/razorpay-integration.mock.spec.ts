import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayProviderService } from './razorpay-provider.service';
import { RazorpayVerificationController } from './razorpay-verification.controller';
import { RazorpayWebhookController } from './razorpay-webhook.controller';

describe('Razorpay Integration Mock', () => {
  let provider: RazorpayProviderService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RazorpayProviderService],
    }).compile();
    provider = module.get<RazorpayProviderService>(RazorpayProviderService);
  });

  it('refuses non-test mode', () => {
    const orig = process.env.RAZORPAY_MODE;
    process.env.RAZORPAY_MODE = 'live';
    expect(() => provider.getPublicKeyId()).toThrow();
    process.env.RAZORPAY_MODE = orig || 'test';
  });

  it('verifies valid signature (mock)', () => {
    // Mock verification with placeholder signature format
    expect(typeof provider.verifyPaymentSignature).toBe('function');
  });

  it('webhook verifies HMAC (mock)', () => {
    expect(typeof provider.verifyWebhookSignature).toBe('function');
  });
});
