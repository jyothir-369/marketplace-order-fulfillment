import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RazorpayProviderService } from './razorpay-provider.service';
import {
  PaymentAuthorization,
  PaymentStatus,
} from '../common/entities/payment-authorization.entity';
import { Order, OrderStatus } from '../common/entities/order.entity';

@Injectable()
export class RazorpayVerificationService {
  constructor(
    private readonly provider: RazorpayProviderService,
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentAuthorization)
    private readonly paymentRepo: Repository<PaymentAuthorization>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async verify(
    buyerUserId: string,
    razorpayOrderId: string,
    paymentId: string,
    signature: string,
    correlationId: string,
  ) {
    if (!razorpayOrderId || !paymentId || !signature) {
      throw new BadRequestException('Payment verification fields are required.');
    }

    const initialPayment = await this.paymentRepo.findOne({
      where: {
        providerOrderId: razorpayOrderId,
        provider: 'razorpay',
      },
    });

    if (!initialPayment) {
      throw new NotFoundException('Razorpay payment record not found.');
    }

    const initialOrder = await this.orderRepo.findOne({
      where: { id: initialPayment.orderId },
    });

    if (!initialOrder) {
      throw new NotFoundException('Order not found.');
    }

    if (!initialOrder.buyerUserId || initialOrder.buyerUserId !== buyerUserId) {
      throw new UnauthorizedException('Buyer does not own this order.');
    }

    if (initialPayment.status === PaymentStatus.CAPTURED) {
      if (initialPayment.providerReference !== paymentId) {
        throw new ConflictException(
          'A different payment is already recorded for this order.',
        );
      }

      return {
        verified: true,
        alreadyProcessed: true,
        orderId: initialOrder.id,
        paymentId,
      };
    }

    if (initialPayment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(
        'This payment attempt is not pending verification.',
      );
    }

    const amountPaise = Math.round(Number(initialPayment.amount) * 100);
    const orderAmountPaise = Math.round(Number(initialOrder.totalAmount) * 100);

    if (
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0 ||
      amountPaise !== orderAmountPaise
    ) {
      throw new BadRequestException(
        'Stored payment amount does not match the order.',
      );
    }

    if (
      !this.provider.verifyPaymentSignature(
        razorpayOrderId,
        paymentId,
        signature,
      )
    ) {
      throw new UnauthorizedException('Invalid Razorpay signature.');
    }

    const captured = await this.provider.verifyCapturedPayment(
      paymentId,
      razorpayOrderId,
      amountPaise,
    );

    if (!captured) {
      throw new BadRequestException(
        'Payment is not captured or payment details do not match.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(PaymentAuthorization, {
        where: { id: initialPayment.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found.');
      }

      const order = await manager.findOne(Order, {
        where: { id: payment.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found.');
      }

      if (!order.buyerUserId || order.buyerUserId !== buyerUserId) {
        throw new UnauthorizedException('Buyer does not own this order.');
      }

      // Webhook and browser verification may race. Accept the same captured
      // payment as an idempotent success, but never a different payment ID.
      if (payment.status === PaymentStatus.CAPTURED) {
        if (payment.providerReference !== paymentId) {
          throw new ConflictException('A different payment was recorded.');
        }

        return {
          verified: true,
          alreadyProcessed: true,
          orderId: order.id,
          paymentId,
        };
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new ConflictException('Payment is no longer pending.');
      }

      if (
        Math.round(Number(payment.amount) * 100) !== amountPaise ||
        Math.round(Number(order.totalAmount) * 100) !== amountPaise
      ) {
        throw new BadRequestException('Payment amount mismatch.');
      }

      if (
        order.status !== OrderStatus.PLACED &&
        order.status !== OrderStatus.CONFIRMED
      ) {
        throw new ConflictException(
          `Cannot confirm an order in status ${order.status}.`,
        );
      }

      await manager.update(PaymentAuthorization, payment.id, {
        status: PaymentStatus.CAPTURED,
        providerReference: paymentId,
        correlationId,
        failureReason: null,
      });

      if (order.status === OrderStatus.PLACED) {
        await manager.update(Order, order.id, {
          status: OrderStatus.CONFIRMED,
        });
      }

      return {
        verified: true,
        alreadyProcessed: false,
        orderId: order.id,
        paymentId,
      };
    });
  }
}