import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RazorpayProviderService } from './razorpay-provider.service';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';
import { Order, OrderStatus } from '../common/entities/order.entity';

@Injectable()
export class RazorpayVerificationService {
  constructor(
    private readonly provider: RazorpayProviderService,
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentAuthorization) private readonly paymentRepo: Repository<PaymentAuthorization>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  async verify(buyerUserId: string, razorpayOrderId: string, paymentId: string, signature: string, amountPaise: number, correlationId: string) {
    const sigValid = this.provider.verifyPaymentSignature(razorpayOrderId, paymentId, signature);
    if (!sigValid) throw new UnauthorizedException('Invalid HMAC signature');

    const captured = await this.provider.verifyCapturedPayment(paymentId, razorpayOrderId, amountPaise);
    if (!captured) throw new BadRequestException('Payment not captured or mismatch');

    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(PaymentAuthorization, { where: { providerOrderId: razorpayOrderId }, order: { createdAt: 'DESC' } });
      if (!payment) throw new NotFoundException('Payment record missing');
      if (payment.status === PaymentStatus.CAPTURED) return { verified: true, alreadyProcessed: true };

      const order = await manager.findOne(Order, { where: { id: payment.orderId } });
      if (!order) throw new NotFoundException('Order missing');
      if (order.buyerUserId && order.buyerUserId !== buyerUserId) throw new UnauthorizedException('Buyer mismatch');
      if (Number(order.totalAmount) * 100 !== amountPaise) throw new BadRequestException('Amount mismatch');

      await manager.update(PaymentAuthorization, payment.id, { status: PaymentStatus.CAPTURED, providerReference: paymentId, correlationId });
      await manager.update(Order, order.id, { status: OrderStatus.CONFIRMED });
      return { verified: true, alreadyProcessed: false };
    });
  }
}
