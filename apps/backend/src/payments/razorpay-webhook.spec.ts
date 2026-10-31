import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { RazorpayProviderService } from './razorpay-provider.service';
import { WebhookEvent } from '../common/entities/webhook-event.entity';
import {
  PaymentAuthorization,
  PaymentStatus,
} from '../common/entities/payment-authorization.entity';
import { Order, OrderStatus } from '../common/entities/order.entity';

describe('RazorpayWebhookController — behavioral tests', () => {
  let controller: RazorpayWebhookController;
  let provider: { verifyWebhookSignature: jest.Mock };
  let eventRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let manager: {
    getRepository: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };

  const eventId = 'evt_test_001';
  const paymentId = 'pay_test_001';
  const providerOrderId = 'order_provider_001';

  const request = (
    event: string,
    entity: Record<string, unknown> = {},
    id = eventId,
  ) => ({
    rawBody: Buffer.from('{"test":"webhook"}'),
    headers: { 'x-razorpay-event-id': id },
    body: {
      event,
      id: 'body_event_001',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: providerOrderId,
            amount: 2500,
            currency: 'INR',
            ...entity,
          },
        },
      },
    },
  });

  const auth = (overrides: Record<string, unknown> = {}) => ({
    id: 'payment-auth-1',
    orderId: 'order-1',
    amount: 25,
    provider: 'razorpay',
    providerOrderId,
    providerReference: null,
    status: PaymentStatus.PENDING,
    failureReason: null,
    ...overrides,
  });

  const order = (overrides: Record<string, unknown> = ({
    status: OrderStatus.PLACED,
  })) => ({
    id: 'order-1',
    status: OrderStatus.PLACED,
    ...overrides,
  });

  beforeEach(() => {
    provider = {
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };

    eventRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => value),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === WebhookEvent) return eventRepo;
        throw new Error('Unexpected repository requested');
      }),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    controller = new RazorpayWebhookController(
      provider as unknown as RazorpayProviderService,
      null as any,
      null as any,
      null as any,
      dataSource as any,
    );
  });

  it('rejects an invalid signature before opening a transaction', async () => {
    provider.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      controller.handle(request('payment.captured'), 'invalid-signature'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(eventRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a missing event ID after signature validation', async () => {
    const req = request('payment.captured');
    req.headers = {} as any;
    req.body.id = '';

    await expect(
      controller.handle(req, 'a'.repeat(64)),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('captures a pending payment and confirms its placed order', async () => {
    manager.findOne
      .mockResolvedValueOnce(auth())
      .mockResolvedValueOnce(order());

    const result = await controller.handle(
      request('payment.captured'),
      'a'.repeat(64),
    );

    expect(manager.update).toHaveBeenNthCalledWith(
      1,
      PaymentAuthorization,
      'payment-auth-1',
      {
        status: PaymentStatus.CAPTURED,
        providerReference: paymentId,
        failureReason: null,
      },
    );

    expect(manager.update).toHaveBeenNthCalledWith(
      2,
      Order,
      'order-1',
      { status: OrderStatus.CONFIRMED },
    );

    expect(eventRepo.update).toHaveBeenCalledWith(
      eventId,
      expect.objectContaining({ status: 'processed' }),
    );
    expect(result).toMatchObject({ received: true, processed: true });
  });

  it('does not process a previously processed event twice', async () => {
    eventRepo.findOne.mockResolvedValue({
      eventId,
      status: 'processed',
    });

    const result = await controller.handle(
      request('payment.captured'),
      'a'.repeat(64),
    );

    expect(result).toMatchObject({ received: true, duplicate: true });
    expect(eventRepo.save).not.toHaveBeenCalled();
    expect(manager.findOne).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('does not downgrade a captured payment after a late failure event', async () => {
    manager.findOne.mockResolvedValueOnce(
      auth({
        status: PaymentStatus.CAPTURED,
        providerReference: paymentId,
      }),
    );

    const result = await controller.handle(
      request('payment.failed'),
      'a'.repeat(64),
    );

    expect(result).toMatchObject({
      skipped: true,
      reason: 'captured-payment-immutable',
    });
    expect(manager.update).not.toHaveBeenCalled();

    // A terminally handled event must not remain pending.
    expect(eventRepo.update).toHaveBeenCalledWith(
      eventId,
      expect.objectContaining({ status: 'processed' }),
    );
  });

  it('marks a repeated capture for the same payment as processed', async () => {
    manager.findOne.mockResolvedValueOnce(
      auth({
        status: PaymentStatus.CAPTURED,
        providerReference: paymentId,
      }),
    );

    const result = await controller.handle(
      request('payment.captured'),
      'a'.repeat(64),
    );

    expect(result).toMatchObject({
      duplicate: true,
      alreadyProcessed: true,
    });
    expect(manager.update).not.toHaveBeenCalled();

    expect(eventRepo.update).toHaveBeenCalledWith(
      eventId,
      expect.objectContaining({ status: 'processed' }),
    );
  });

  it('skips a mismatched amount without changing payment or order state', async () => {
    manager.findOne
      .mockResolvedValueOnce(auth())
      .mockResolvedValueOnce(order());

    const result = await controller.handle(
      request('payment.captured', { amount: 2499 }),
      'a'.repeat(64),
    );

    expect(result).toMatchObject({ processed: true });
    expect(manager.update).not.toHaveBeenCalled();
    expect(eventRepo.update).toHaveBeenCalledWith(
      eventId,
      expect.objectContaining({ status: 'processed' }),
    );
  });

  it('does not downgrade an already captured payment or confirmed order', async () => {
    manager.findOne.mockResolvedValueOnce(
      auth({
        status: PaymentStatus.CAPTURED,
        providerReference: 'pay_different',
      }),
    );

    const result = await controller.handle(
      request('payment.captured'),
      'a'.repeat(64),
    );

    expect(result).toMatchObject({
      skipped: true,
      reason: 'inconsistent-state',
    });
    expect(manager.update).not.toHaveBeenCalled();
  });
});
