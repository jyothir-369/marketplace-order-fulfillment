import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RazorpayProviderService } from './razorpay-provider.service';
import { Order, OrderStatus } from '../common/entities/order.entity';
import {
  OrderLineItem,
  FulfillmentStatus,
} from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { Promotion } from '../common/entities/promotion.entity';
import {
  PaymentAuthorization,
  PaymentStatus,
} from '../common/entities/payment-authorization.entity';
import { AuditService } from '../common/audit';

export interface RazorpayCheckoutItem {
  productId: string;
  quantity: number;
}

export interface RazorpayInitiationResult {
  success: true;
  orderId: string;
  orderNumber: string | null;
  providerOrderId: string;
  publicKeyId: string;
  amountPaise: number;
  currency: string;
}

@Injectable()
export class RazorpayInitiationService {
  constructor(
    private readonly provider: RazorpayProviderService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async initiate(
    items: RazorpayCheckoutItem[],
    shippingAddress: string,
    buyerUserId: string,
    correlationId: string,
  ): Promise<RazorpayInitiationResult> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Cart must contain at least one item.');
    }

    if (
      typeof shippingAddress !== 'string' ||
      shippingAddress.trim().length < 5 ||
      shippingAddress.trim().length > 500
    ) {
      throw new BadRequestException('Invalid shipping address.');
    }

    if (!buyerUserId) {
      throw new BadRequestException('Authenticated buyer is required.');
    }

    const ids = items.map((item) => item.productId);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Submit each product once and use quantity for multiple units.',
      );
    }

    for (const item of items) {
      if (
        !item.productId ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new BadRequestException('Invalid cart item.');
      }
    }

    const normalizedItems = [...items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );
    const normalizedAddress = shippingAddress.trim();

    return this.dataSource.transaction(async (manager) => {
      // Serialize concurrent initiation requests for the same buyer.
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        [`razorpay-init:${buyerUserId}`],
      );

      // Reuse a matching pending attempt instead of reserving stock twice.
      const pending = await manager.query(
        `SELECT
           p.id AS "paymentId",
           p.order_id AS "orderId",
           p.amount AS amount,
           p.provider_order_id AS "providerOrderId",
           o.order_number AS "orderNumber",
           o.shipping_address AS "shippingAddress"
         FROM payment_authorizations p
         INNER JOIN orders o ON o.id = p.order_id
         WHERE p.provider = 'razorpay'
           AND p.status = 'pending'
           AND o.buyer_user_id = $1
           AND o.status = 'placed'
         ORDER BY p.created_at DESC
         FOR UPDATE OF p, o`,
        [buyerUserId],
      );

      for (const existing of pending) {
        const savedLines = await manager.find(OrderLineItem, {
          where: { orderId: existing.orderId },
        });

        const savedItems = savedLines
          .map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          }))
          .sort((a, b) => a.productId.localeCompare(b.productId));

        const sameItems =
          JSON.stringify(savedItems) === JSON.stringify(normalizedItems);

        const sameAddress = existing.shippingAddress === normalizedAddress;

        if (sameItems && sameAddress && existing.providerOrderId) {
          return {
            success: true as const,
            orderId: existing.orderId,
            orderNumber: existing.orderNumber,
            providerOrderId: existing.providerOrderId,
            publicKeyId: this.provider.getPublicKeyId(),
            amountPaise: Math.round(Number(existing.amount) * 100),
            currency: 'INR',
          };
        }

        throw new ConflictException(
          'A pending Razorpay checkout already exists for this buyer. Retry the same cart or resolve the pending checkout before changing it.',
        );
      }

      const lockedProducts = new Map<string, Product>();

      // Lock in stable ID order to reduce deadlock risk.
      for (const id of [...ids].sort()) {
        const product = await manager
          .createQueryBuilder(Product, 'product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id })
          .getOne();

        if (!product) {
          throw new NotFoundException(`Product ${id} not found.`);
        }

        if (product.isActive === false) {
          throw new BadRequestException(
            `Product ${product.name} is not available.`,
          );
        }

        lockedProducts.set(id, product);
      }

      // Server-authoritative promotion lookup per product (vendor-scoped, non-stacking, UTC-date valid).
      const checkoutPromotionsRepo = manager.getRepository(Promotion);

      let amountPaise = 0;

      for (const item of normalizedItems) {
        const product = lockedProducts.get(item.productId)!;
        const pricePaise = Math.round(Number(product.price) * 100);

        // Compute promotion-adjusted price from DB promotions (not client input).
        let discountPercent: number | null = null;
        if (product.vendorId) {
          const promos = await checkoutPromotionsRepo.find({
            where: { vendorId: product.vendorId, isActive: true },
          });
          const now = new Date();
          const validPromo = promos
            .filter((p) => {
              const start = p.startDate ? new Date(p.startDate) : null;
              const end = p.endDate ? new Date(p.endDate) : null;
              return (!start || start <= now) && (!end || end >= now);
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
          if (validPromo) discountPercent = Number(validPromo.discountPercent);
        }
        const effectivePaise = discountPercent !== null
          ? Math.round(pricePaise * (1 - discountPercent / 100))
          : pricePaise;
        const lineAmountPaise = effectivePaise * item.quantity;

        if (!Number.isSafeInteger(effectivePaise) || effectivePaise < 0) {
          throw new BadRequestException('Invalid computed product price.');
        }

        if (!Number.isSafeInteger(lineAmountPaise) || lineAmountPaise < 0) {
          throw new BadRequestException('Cart line amount overflow or invalid.');
        }

        if (amountPaise > Number.MAX_SAFE_INTEGER - lineAmountPaise) {
          throw new BadRequestException('Cart total overflow or invalid.');
        }

        if (Number(product.stockCount) < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for ${product.name}.`,
          );
        }

        amountPaise += lineAmountPaise;
      }

      if (amountPaise <= 0) {
        throw new BadRequestException('Cart total must be positive.');
      }

      const totalAmount = amountPaise / 100;
      const [sequenceRow] = await manager.query(
        "SELECT nextval('order_number_seq') AS seq",
      );

      const date = new Date();
      const datePart =
        `${date.getFullYear()}` +
        `${String(date.getMonth() + 1).padStart(2, '0')}` +
        `${String(date.getDate()).padStart(2, '0')}`;

      const orderNumber =
        `ORD-${datePart}-${String(Number(sequenceRow.seq)).padStart(6, '0')}`;

      const order = manager.create(Order, {
        buyerId: buyerUserId,
        buyerUserId,
        status: OrderStatus.PLACED,
        correlationId,
        totalAmount,
        shippingAddress: normalizedAddress,
        orderNumber,
      });

      const savedOrder = await manager.save(Order, order);

      // Razorpay order uses the backend-calculated amount, never browser totals.
      const providerOrder = await this.provider.createOrder(
        amountPaise,
        `ORD-${savedOrder.id}`,
        {
          orderId: savedOrder.id,
          buyerId: buyerUserId,
          correlationId,
        },
      );

      if (
        providerOrder.amount !== amountPaise ||
        providerOrder.currency !== 'INR'
      ) {
        throw new BadRequestException(
          'Razorpay order amount/currency did not match the checkout.',
        );
      }

      const lineItems: OrderLineItem[] = [];

      // Save promotion snapshot into order line items for immutability.
      const promotionsRepo = manager.getRepository(Promotion);

      for (const item of normalizedItems) {
        const product = lockedProducts.get(item.productId)!;
        const pricePaise = Math.round(Number(product.price) * 100);

        // Recompute promotion (authoritative server-side; never trust client price/discount).
        let discountPercent: number | null = null;
        let promotionId: string | null = null;
        let promotionDiscountPercent: number | null = null;
        if (product.vendorId) {
          const promos = await promotionsRepo.find({
            where: { vendorId: product.vendorId, isActive: true },
          });
          const nowLine = new Date();
          const validPromo = promos
            .filter((p) => {
              const start = p.startDate ? new Date(p.startDate) : null;
              const end = p.endDate ? new Date(p.endDate) : null;
              return (!start || start <= nowLine) && (!end || end >= nowLine);
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
          if (validPromo) {
            discountPercent = Number(validPromo.discountPercent);
            promotionId = validPromo.id;
            promotionDiscountPercent = Number(validPromo.discountPercent);
          }
        }
        const effectivePaise = discountPercent !== null
          ? Math.round(pricePaise * (1 - discountPercent / 100))
          : pricePaise;
        const unitPrice = effectivePaise / 100;
        const lineTotal = (effectivePaise * item.quantity) / 100;
        const previousStock = Number(product.stockCount);
        const nextStock = previousStock - item.quantity;

        await manager.update(
          Product,
          { id: product.id },
          { stockCount: nextStock },
        );

        await this.auditService.logInventoryDecrement(
          correlationId,
          product.id,
          previousStock,
          nextStock,
          item.quantity,
        );

        lineItems.push(
          manager.create(OrderLineItem, {
            orderId: savedOrder.id,
            productId: product.id,
            vendorId: product.vendorId,
            quantity: item.quantity,
            unitPrice,
            lineTotal,
            promotionId,
            promotionDiscountPercent,
            effectiveUnitPrice: unitPrice,
            fulfillmentStatus: FulfillmentStatus.PENDING,
          }),
        );
      }

      await manager.save(OrderLineItem, lineItems);

      const payment = manager.create(PaymentAuthorization, {
        orderId: savedOrder.id,
        amount: totalAmount,
        status: PaymentStatus.PENDING,
        provider: 'razorpay',
        providerOrderId: providerOrder.id,
        providerReference: null,
        correlationId,
        failureReason: null,
      });

      await manager.save(PaymentAuthorization, payment);
      await this.auditService.logOrderCreated(
        correlationId,
        savedOrder.id,
        buyerUserId,
        totalAmount,
      );

      return {
        success: true as const,
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        providerOrderId: providerOrder.id,
        publicKeyId: this.provider.getPublicKeyId(),
        amountPaise: providerOrder.amount,
        currency: providerOrder.currency,
      };
    });
  }
}