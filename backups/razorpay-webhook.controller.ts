import { Controller, Post, Req, Headers, UnauthorizedException, Inject } from '@nestjs/common';
import { RazorpayProviderService } from './razorpay-provider.service';
import { WebhookEvent } from '../common/entities/webhook-event.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('payments/razorpay/webhook')
export class RazorpayWebhookController {
  constructor(
    private readonly provider: RazorpayProviderService,
    @InjectRepository(WebhookEvent) private readonly webhookRepo: Repository<WebhookEvent>,
  ) {}

  @Post()
  async handle(@Req() req: any, @Headers('x-razorpay-signature') sig: string) {
    const rawBody: Buffer = (req as any).rawBody || Buffer.alloc(0);
    const valid = this.provider.verifyWebhookSignature(rawBody, sig);
    if (!valid) throw new UnauthorizedException('Invalid webhook signature');
    
    const eventId = req.body?.id || req.body?.payload?.payment?.entity?.id || 'unknown';
    const eventType = req.body?.event || 'unknown';
    
    // Idempotency: check for existing event
    const existing = await this.webhookRepo.findOne({ where: { eventId } });
    if (existing && existing.status === 'processed') {
      return { received: true, duplicate: true };
    }
    
    // Save/update event record (transactional idempotency)
    const event = this.webhookRepo.create({
      eventId,
      eventType,
      payloadId: req.body?.payload?.payment?.entity?.id || null,
      status: 'processed',
    });
    await this.webhookRepo.save(event);
    
    return { received: true, event: eventType, id: eventId };
  }
}
