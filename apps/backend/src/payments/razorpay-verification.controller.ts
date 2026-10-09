import { Controller, Post, Body, Req, UnauthorizedException } from '@nestjs/common';
import { RazorpayProviderService } from './razorpay-provider.service';

@Controller('payments/razorpay/verify')
export class RazorpayVerificationController {
  constructor(private readonly provider: RazorpayProviderService) {}

  @Post()
  async verify(@Req() req: any, @Body() body: any) {
    // Mock implementation: verifies HMAC and captures if valid; no DB write due to mock-only testing
    const sig = req.headers['x-razorpay-signature'] || body.signature || '';
    const orderId = body.razorpay_order_id || body.order_id;
    const paymentId = body.razorpay_payment_id || body.payment_id;
    const isValid = this.provider.verifyPaymentSignature(orderId, paymentId, sig);
    if (!isValid) throw new UnauthorizedException('Invalid signature');
    const captured = await this.provider.verifyCapturedPayment(paymentId, orderId, body.amount || 100);
    return { verified: captured, orderId, paymentId };
  }
}
