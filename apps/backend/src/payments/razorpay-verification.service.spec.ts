import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RazorpayProviderService } from './razorpay-provider.service';
import { RazorpayVerificationService } from './razorpay-verification.service';
import {
  PaymentAuthorization,
  PaymentStatus,
} from '../common/entities/payment-authorization.entity';
import { Order, OrderStatus } from '../common/entities/order.entity';

describe('RazorpayVerificationService', () => {
  const buyerId = 'buyer-1';
  const orderId = 'order-1';
  const razorpayOrderId = 'order_provider_1';
  const paymentId = 'pay_provider_1';
  const signature = 'test-signature';
  const correlationId = 'corr-1';
  const amount = 125.5;
  const amountPaise = 12550;

  let service: RazorpayVerificationService;
  let provider: jest.Mocked<
    Pick<
      RazorpayProviderService,
      'verifyPaymentSignature' | 'verifyCapturedPayment'
    >
  >;
  let paymentRepo: jest.Mocked<
    Pick<Repository<PaymentAuthorization>, 'findOne'>
  >;
  let orderRepo: jest.Mocked<Pick<Repository<Order>, 'findOne'>>;
  let manager: {
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let payment: PaymentAuthorization;
  let order: Order;

  const makeService = () =>
    new RazorpayVerificationService(
      provider as unknown as RazorpayProviderService,
      dataSource as unknown as DataSource,
      paymentRepo as unknown as Repository<PaymentAuthorization>,
      orderRepo as unknown as Repository<Order>,
    );

  beforeEach(() => {
    jest.clearAllMocks();

    payment = {
      id: 'payment-row-1',
      orderId,
      amount,
      status: PaymentStatus.PENDING,
      provider: 'razorpay',
      providerOrderId: razorpayOrderId,
      providerReference: null,
      correlationId: null,
      failureReason: null,
    } as PaymentAuthorization;

    order = {
      id: orderId,
      buyerUserId: buyerId,
      status: OrderStatus.PLACED,
      totalAmount: amount,
    } as Order;

    provider = {
      verifyPaymentSignature: jest.fn().mockReturnValue(true),
      verifyCapturedPayment: jest.fn().mockResolvedValue(true),
    };

    paymentRepo = {
      findOne: jest.fn().mockResolvedValue(payment),
    };

    orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
    };

    manager = {
      findOne: jest.fn()
        .mockImplementation(async (entity: unknown) => {
          if (entity === PaymentAuthorization) return payment;
          if (entity === Order) return order;
          return null;
        }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(
        async (callback: (tx: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
    };

    service = makeService();
  });

  const verify = (
    overrides: Partial<{
      buyerUserId: string;
      razorpayOrderId: string;
      paymentId: string;
      signature: string;
      correlationId: string;
    }> = {},
  ) =>
    service.verify(
      overrides.buyerUserId ?? buyerId,
      overrides.razorpayOrderId ?? razorpayOrderId,
      overrides.paymentId ?? paymentId,
      overrides.signature ?? signature,
      overrides.correlationId ?? correlationId,
    );

  it('rejects missing verification fields before database access', async () => {
    await expect(
      service.verify(buyerId, '', paymentId, signature, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.verify(buyerId, razorpayOrderId, '', signature, correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.verify(buyerId, razorpayOrderId, paymentId, '', correlationId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(paymentRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects an unknown provider order', async () => {
    paymentRepo.findOne.mockResolvedValue(null);

    await expect(verify()).rejects.toBeInstanceOf(NotFoundException);
    expect(orderRepo.findOne).not.toHaveBeenCalled();
  });

  it('rejects a missing order', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(verify()).rejects.toBeInstanceOf(NotFoundException);
    expect(provider.verifyPaymentSignature).not.toHaveBeenCalled();
  });

  it('rejects a buyer who does not own the order', async () => {
    await expect(verify({ buyerUserId: 'another-buyer' }))
      .rejects.toBeInstanceOf(UnauthorizedException);

    expect(provider.verifyPaymentSignature).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects an order with no authenticated buyer owner', async () => {
    order.buyerUserId = null;

    await expect(verify()).rejects.toBeInstanceOf(UnauthorizedException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects a payment that is no longer pending', async () => {
    payment.status = PaymentStatus.FAILED;

    await expect(verify()).rejects.toBeInstanceOf(ConflictException);
    expect(provider.verifyPaymentSignature).not.toHaveBeenCalled();
  });

  it('returns idempotent success for the same already-captured payment', async () => {
    payment.status = PaymentStatus.CAPTURED;
    payment.providerReference = paymentId;

    await expect(verify()).resolves.toEqual({
      verified: true,
      alreadyProcessed: true,
      orderId,
      paymentId,
    });

    expect(provider.verifyPaymentSignature).not.toHaveBeenCalled();
    expect(provider.verifyCapturedPayment).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects a different payment ID when the payment is already captured', async () => {
    payment.status = PaymentStatus.CAPTURED;
    payment.providerReference = 'pay_different';

    await expect(verify()).rejects.toBeInstanceOf(ConflictException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects a stored payment amount that does not match the order', async () => {
    payment.amount = 100;

    await expect(verify()).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.verifyPaymentSignature).not.toHaveBeenCalled();
    expect(provider.verifyCapturedPayment).not.toHaveBeenCalled();
  });

  it('rejects a non-positive or unsafe stored payment amount', async () => {
    payment.amount = 0;

    await expect(verify()).rejects.toBeInstanceOf(BadRequestException);

    payment.amount = Number.MAX_SAFE_INTEGER;

    await expect(verify()).rejects.toBeInstanceOf(BadRequestException);
    expect(provider.verifyPaymentSignature).not.toHaveBeenCalled();
  });

  it('rejects an invalid checkout signature', async () => {
    provider.verifyPaymentSignature.mockReturnValue(false);

    await expect(verify()).rejects.toBeInstanceOf(UnauthorizedException);

    expect(provider.verifyPaymentSignature).toHaveBeenCalledWith(
      razorpayOrderId,
      paymentId,
      signature,
    );
    expect(provider.verifyCapturedPayment).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects a payment that the provider has not confirmed as captured', async () => {
    provider.verifyCapturedPayment.mockResolvedValue(false);

    await expect(verify()).rejects.toBeInstanceOf(BadRequestException);

    expect(provider.verifyCapturedPayment).toHaveBeenCalledWith(
      paymentId,
      razorpayOrderId,
      amountPaise,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('confirms the order and captures payment inside a transaction', async () => {
    await expect(verify()).resolves.toEqual({
      verified: true,
      alreadyProcessed: false,
      orderId,
      paymentId,
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.findOne).toHaveBeenNthCalledWith(
      1,
      PaymentAuthorization,
      {
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      },
    );
    expect(manager.findOne).toHaveBeenNthCalledWith(2, Order, {
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' },
    });

    expect(manager.update).toHaveBeenNthCalledWith(
      1,
      PaymentAuthorization,
      payment.id,
      {
        status: PaymentStatus.CAPTURED,
        providerReference: paymentId,
        correlationId,
        failureReason: null,
      },
    );
    expect(manager.update).toHaveBeenNthCalledWith(
      2,
      Order,
      orderId,
      { status: OrderStatus.CONFIRMED },
    );
  });

  it('does not downgrade an already-confirmed order', async () => {
    order.status = OrderStatus.CONFIRMED;

    await expect(verify()).resolves.toMatchObject({
      verified: true,
      alreadyProcessed: false,
    });

    expect(manager.update).toHaveBeenCalledTimes(1);
    expect(manager.update).toHaveBeenCalledWith(
      PaymentAuthorization,
      payment.id,
      expect.objectContaining({ status: PaymentStatus.CAPTURED }),
    );
  });

  it('rejects a missing payment discovered inside the transaction', async () => {
    manager.findOne.mockResolvedValueOnce(null);

    await expect(verify()).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects a missing order discovered inside the transaction', async () => {
    manager.findOne
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(null);

    await expect(verify()).rejects.toBeInstanceOf(NotFoundException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rechecks buyer ownership inside the transaction', async () => {
    manager.findOne
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce({ ...order, buyerUserId: 'changed-owner' });

    await expect(verify()).rejects.toBeInstanceOf(UnauthorizedException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('accepts a same-payment webhook race as idempotent success', async () => {
    const capturedPayment = {
      ...payment,
      status: PaymentStatus.CAPTURED,
      providerReference: paymentId,
    };

    manager.findOne.mockResolvedValueOnce(capturedPayment);

    await expect(verify()).resolves.toEqual({
      verified: true,
      alreadyProcessed: true,
      orderId,
      paymentId,
    });

    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects a conflicting payment discovered during the transaction', async () => {
    const capturedPayment = {
      ...payment,
      status: PaymentStatus.CAPTURED,
      providerReference: 'pay_other',
    };

    manager.findOne.mockResolvedValueOnce(capturedPayment);

    await expect(verify()).rejects.toBeInstanceOf(ConflictException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects a payment that ceases to be pending during the transaction', async () => {
    manager.findOne.mockResolvedValueOnce({
      ...payment,
      status: PaymentStatus.FAILED,
    });

    await expect(verify()).rejects.toBeInstanceOf(ConflictException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects an order status that cannot be confirmed', async () => {
    order.status = OrderStatus.CANCELLED;

    await expect(verify()).rejects.toBeInstanceOf(ConflictException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects a transaction-time amount mismatch', async () => {
    manager.findOne
      .mockResolvedValueOnce({ ...payment, amount: 100 })
      .mockResolvedValueOnce(order);

    await expect(verify()).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('propagates transaction errors instead of reporting success', async () => {
    dataSource.transaction.mockRejectedValue(
      new Error('simulated transaction failure'),
    );

    await expect(verify()).rejects.toThrow('simulated transaction failure');
  });
});
