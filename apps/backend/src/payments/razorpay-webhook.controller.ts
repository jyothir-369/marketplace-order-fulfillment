import { Controller, Post, Req, Headers, UnauthorizedException } from '@nestjs/common';
import { RazorpayProviderService } from './razorpay-provider.service';

@Controller('payments/razorpay/webhook')
export class RazorpayWebhookController {
  constructor(private readonly provider: RazorpayProviderService) {}

  @Post()
  async handle(@Req() req: any, @Headers('x-razorpay-signature') sig: string) {
    const rawBody = JSON.stringify(req.body);
    // Note: exact raw body preservation requires raw-body middleware; using JSON.stringify for mock
    const valid = this.provider.verifyWebhookSignature(rawBody, sig);
    if (!valid) throw new UnauthorizedException('Invalid webhook signature');
    return { received: true, event: req.body.event, id: req.body.payload?.payment?.entity?.id };
  }
}
