import { Controller, Post, Req, Headers, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { RazorpayProviderService } from './razorpay-provider.service';
import { WebhookEvent } from '../common/entities/webhook-event.entity';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';
import { Order, OrderStatus } from '../common/entities/order.entity';

@Controller('payments/razorpay/webhook')
export class RazorpayWebhookController {
  constructor(
    private readonly provider: RazorpayProviderService,
    @InjectRepository(WebhookEvent) private readonly webhookRepo: Repository<WebhookEvent>,
    @InjectRepository(PaymentAuthorization) private readonly paymentRepo: Repository<PaymentAuthorization>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  @Post()
  async handle(@Req() req: any, @Headers('x-razorpay-signature') sig: string) {
    const rawBody: Buffer = (req as any).rawBody || Buffer.alloc(0);
    const valid = this.provider.verifyWebhookSignature(rawBody, sig);
    if (!valid) throw new UnauthorizedException('Invalid webhook signature');
    const body = req.body || {};
    // Phase G.1: Read from Razorpay header x-razorpay-event-id; normalize/validate
    const headerEventId = (req.headers && req.headers['x-razorpay-event-id']) ? String(req.headers['x-razorpay-event-id']).trim() : null;
    // Prefer stable header event ID; fall back only to body event id (not payment id)
    const eventId = (headerEventId && /^[a-zA-Z0-9_-]+$/.test(headerEventId) ? headerEventId : null)
      || (body.id && typeof body.id === 'string' && body.id.length > 0 ? body.id.trim() : null);
    if (!eventId || typeof eventId !== 'string' || eventId.length < 1 || eventId === 'unknown') throw new BadRequestException('Missing or malformed Razorpay event id');
    const eventType = body.event || 'unknown';

    return this.dataSource.transaction(async (manager) => {
      const eventRepo = manager.getRepository(WebhookEvent);
      // Atomic duplicate prevention using unique constraint
      const existing = await eventRepo.findOne({ where: { eventId }, lock: { mode: 'pessimistic_write' } }).catch(() => null);
      if (existing && existing.status === 'processed') {
        return { received: true, duplicate: true, eventId, eventType };
      }

      const event = eventRepo.create({ eventId, eventType, payloadId: body.payload && body.payload.payment ? body.payload.payment.entity ? body.payload.payment.entity.id : null : null, status: 'pending' });
      await eventRepo.save(event);

      if (eventType === 'payment.captured' || eventType === 'payment.failed') {
        const paymentEntity = body.payload && body.payload.payment && body.payload.payment.entity ? body.payload.payment.entity : null;
        if (paymentEntity && paymentEntity.id && paymentEntity.order_id) {
          const auth = await manager.findOne(PaymentAuthorization, { where: { providerOrderId: paymentEntity.order_id, provider: 'razorpay' }, lock: { mode: 'pessimistic_write' } });
          if (auth) {

          // Phase G.2: Prevent out-of-order regressions / unsupported transitions
          if (eventType === 'payment.failed') {
            if (auth.status === PaymentStatus.CAPTURED) {
              // Late failed event must never downgrade captured payment
              return { received: true, duplicate: false, eventId, eventType, skipped: true, reason: 'captured-payment-immutable' };
            }
            if (auth.status !== PaymentStatus.PENDING) {
              return { received: true, duplicate: false, eventId, eventType, skipped: true, reason: 'not-pending' };
            }
          }
          if (eventType === 'payment.captured') {
            if (auth.status === PaymentStatus.CAPTURED && auth.providerReference === paymentEntity.id) {
              return { received: true, duplicate: true, eventId, eventType, alreadyProcessed: true };
            }
            if (auth.status === PaymentStatus.FAILED || auth.status === PaymentStatus.CAPTURED && auth.providerReference !== paymentEntity.id) {
              return { received: true, duplicate: false, eventId, eventType, skipped: true, reason: 'inconsistent-state' };
            }
          }
            const amountPaise = Number(paymentEntity.amount);
            const order = await manager.findOne(Order, { where: { id: auth.orderId }, lock: { mode: 'pessimistic_write' } });
            // Validate before state change
            if (order && auth.amount === amountPaise / 100 && auth.providerOrderId === paymentEntity.order_id) {
              if (eventType === 'payment.captured' && auth.status !== PaymentStatus.CAPTURED) {
                await manager.update(PaymentAuthorization, auth.id, { status: PaymentStatus.CAPTURED, providerReference: paymentEntity.id, failureReason: null });
                if (order.status === OrderStatus.PLACED || order.status === OrderStatus.CONFIRMED) {
                  await manager.update(Order, order.id, { status: OrderStatus.CONFIRMED });
                }
              } else if (eventType === 'payment.failed' && auth.status === PaymentStatus.PENDING) {
                await manager.update(PaymentAuthorization, auth.id, { status: PaymentStatus.FAILED, failureReason: paymentEntity.error_description || 'Failed by webhook', providerReference: paymentEntity.id });
              }
            }
          }
        }
      }

      await eventRepo.update(eventId, { status: 'processed', processedAt: new Date() });
      return { received: true, event: eventType, id: eventId, processed: true };
    });
  }
}