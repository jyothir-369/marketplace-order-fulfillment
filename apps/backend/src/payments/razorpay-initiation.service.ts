import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RazorpayProviderService } from './razorpay-provider.service';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';
import { Order } from '../common/entities/order.entity';

@Injectable()
export class RazorpayInitiationService {
  constructor(
    private readonly provider: RazorpayProviderService,
    private readonly dataSource: DataSource,
    @InjectRepository(PaymentAuthorization)
    private readonly paymentRepo: Repository<PaymentAuthorization>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async initiate(orderId: string, buyerUserId: string, correlationId: string): Promise<{ orderId: string; providerOrderId: string; publicKeyId: string }> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.buyerUserId && order.buyerUserId !== buyerUserId) throw new BadRequestException('Buyer mismatch');

      const existing = await manager.findOne(PaymentAuthorization, { where: { orderId, provider: 'razorpay' }, order: { createdAt: 'DESC' } });
      if (existing && existing.providerOrderId && existing.status === PaymentStatus.PENDING) {
        return { orderId: order.id, providerOrderId: existing.providerOrderId, publicKeyId: this.provider.getPublicKeyId() };
      }

      const amountPaise = Math.round(Number(order.totalAmount) * 100);
      const result = await this.provider.createOrder(amountPaise, `ORD-${orderId}`, { orderId: order.id, buyerId: buyerUserId, correlationId });

      const payment = manager.create(PaymentAuthorization, {
        orderId: order.id,
        amount: Number(order.totalAmount),
        status: PaymentStatus.PENDING,
        provider: 'razorpay',
        providerOrderId: result.id,
        providerReference: null,
        correlationId,
        failureReason: null,
      });
      await manager.save(PaymentAuthorization, payment);

      return { orderId: order.id, providerOrderId: result.id, publicKeyId: this.provider.getPublicKeyId() };
    });
  }
}
