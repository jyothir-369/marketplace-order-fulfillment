import { Injectable, Logger, NotFoundException, BadRequestException, HttpException, HttpStatus, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsRelations } from 'typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { Promotion } from '../common/entities/promotion.entity';
import { CheckoutDto, CheckoutResponseDto, OrderResponseDto, OrderLineItemResponseDto, TransitionOrderDto, OrderTransitionAction } from './dto/orders.dto';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService, AuditLog, AuditEntityType } from '../common/audit';
import { PaymentsService } from '../payments/payments.service';
import { PaymentAuthorization, PaymentStatus } from '../common/entities/payment-authorization.entity';
import { PromotionCheckoutSnapshotService } from '../payments/snapshot/promotion-checkout-snapshot.service';
import { computeDiscountCents } from '../payments/category-b/category-b.snapshot.interface';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  /** Valid source -> target status map for each transition action. */
  private readonly allowedTransitions: Record<OrderTransitionAction, Partial<Record<OrderStatus, OrderStatus>>> = {
    CONFIRM: { [OrderStatus.PLACED]: OrderStatus.CONFIRMED },
    FULFILL: { [OrderStatus.CONFIRMED]: OrderStatus.FULFILLING },
    SHIP:    { [OrderStatus.FULFILLING]: OrderStatus.FULFILLED },
    CANCEL:  {},
  };

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderLineItem)
    private readonly lineItemRepository: Repository<OrderLineItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
    private readonly paymentsService: PaymentsService,
    @Optional() private readonly promotionSnapshotService?: PromotionCheckoutSnapshotService,
  ) {}

  async checkout(dto: CheckoutDto, correlationId: string, buyerUserId?: string): Promise<CheckoutResponseDto> {
    this.logger.log('Starting checkout for buyer ' + dto.buyerId + ' with ' + dto.items.length + ' items', OrdersService.name, correlationId);

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .where('product.id IN (:...ids)', { ids: productIds })
      .getMany();

    if (products.length !== productIds.length) {
      throw new BadRequestException('Products not found');
    }

    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    // Phase 3 authoritative: promotion-adjusted total must equal authorization,
    // line totals, order total, and capture. Compute before auth using same
    // vendor-scoped, scheduled, non-stacking promotion rule; reuse snapshot
    // inside transaction so promotion can't change between auth and capture.
    // Phase 3 authoritative: promotion-adjusted total computed from product snapshot
    // before authorization. Use repository injection if available; else base price.
    // (OrdersService does not inject promotionRepository — compute with base + query)
    // Use the injected promotion repository (not an unsafe cast) for
    // server-authoritative promotion-adjusted total before authorization.
    // One authoritative promotion and price snapshot per product for this checkout.
    const pricingSnapshots = new Map<string, {
      originalUnitPriceCents: number;
      effectiveUnitPriceCents: number;
      promotion: Promotion | null;
      discountPercent: number;
    }>();
    const promotionsByVendor = new Map<string, Promotion[]>();
    const pricingTime = new Date();

    const parseUsdCents = (value: unknown): number => {
      const text = String(value).trim();
      const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
      if (!match) {
        throw new BadRequestException('Product price must be a valid USD amount with at most two decimal places');
      }
      const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
      if (!Number.isSafeInteger(cents) || cents < 1 || cents > 2147483647) {
        throw new BadRequestException('Product price exceeds supported USD-cent limits');
      }
      return cents;
    };

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException('Product not found: ' + item.productId);

      const originalUnitPriceCents = parseUsdCents(product.price);
      let promotion: Promotion | null = null;

      if (!promotionsByVendor.has(product.vendorId)) {
        const promotions = await this.promotionRepository.find({
          where: { vendorId: product.vendorId, isActive: true },
        });
        promotionsByVendor.set(product.vendorId, promotions);
      }

      promotion = (promotionsByVendor.get(product.vendorId) ?? [])
        .filter((p) => {
          const start = p.startDate ? new Date(p.startDate) : null;
          const end = p.endDate ? new Date(p.endDate) : null;
          return (
            p.approvalState === 'APPROVED' &&
            p.currency === 'USD' &&
            p.vendorId === product.vendorId &&
            Number.isFinite(Number(p.discountPercent)) &&
            Number(p.discountPercent) >= 0 &&
            Number(p.discountPercent) <= 100 &&
            (!start || start <= pricingTime) &&
            (!end || end >= pricingTime)
          );
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;

      const discountPercent = promotion ? Number(promotion.discountPercent) : 0;
      // Blocker 3 safeguard: discount percent must be finite, safe, in [0,100] before integer-cent calculation
      if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100 ) {
        throw new BadRequestException('Invalid discount percentage for checkout calculation');
      }
      // Blocker 3 safeguard: original unit price cents must be safe non-negative integer (not float, not unsafe)
      if (!Number.isSafeInteger(originalUnitPriceCents) || originalUnitPriceCents < 0) {
        throw new BadRequestException('Invalid USD cent price for checkout');
      }
      const effectiveUnitPriceCents = promotion
        ? computeDiscountCents(originalUnitPriceCents, discountPercent)
        : originalUnitPriceCents;

      if (
        !Number.isSafeInteger(effectiveUnitPriceCents) ||
        effectiveUnitPriceCents < 0 ||
        effectiveUnitPriceCents > 2147483647
      ) {
        throw new BadRequestException('Discounted USD price exceeds supported cent limits');
      }

      pricingSnapshots.set(item.productId, {
        originalUnitPriceCents,
        effectiveUnitPriceCents,
        promotion,
        discountPercent,
      });
    }

    const expectedTotalCents = dto.items.reduce((sum, item) => {
      const price = pricingSnapshots.get(item.productId)!.effectiveUnitPriceCents;
      const lineCents = price * item.quantity;
      if (!Number.isSafeInteger(lineCents) || lineCents > 2147483647) {
        throw new BadRequestException('Checkout line total exceeds supported USD-cent limits');
      }
      const next = sum + lineCents;
      if (!Number.isSafeInteger(next) || next > 2147483647) {
        throw new BadRequestException('Checkout total exceeds supported USD-cent limits');
      }
      return next;
    }, 0);

    const expectedTotal = expectedTotalCents / 100;

    return this.dataSource.transaction(async (manager) => {
      // Remediation 1 Phase 3 / Phase 4: idempotency key — read inside transaction
      // with pessimistic lock on existing order to prevent concurrent replay.
      if (dto.idempotencyKey) {
        // Advisory lock serializes concurrent same-key requests at DB level.
        // Key is buyer-scoped + normalized payload fingerprint.
        const lockKey = 'checkout_' + dto.buyerId + '_' + dto.idempotencyKey;
        await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKey]);

        const existing = await (manager as any).createQueryBuilder(Order, 'o')
          .setLock('pessimistic_read')
          .where('o.buyerId = :buyerId', { buyerId: dto.buyerId })
          .andWhere('o.idempotencyKey = :key', { key: dto.idempotencyKey })
          .getOne();
        if (existing) {
          // Explicit conflict check: same key must match full normalized payload
          // (buyer + sorted items + quantities + shipping + payment token fingerprint).
          // If existing doesn't match, the DB unique index will block insert.
          // If it matches, replay safely (no duplicate auth or inventory).
          const payloadHash = this.normalizePayload(dto);
          if (existing.idempotencyPayloadHash && existing.idempotencyPayloadHash !== payloadHash) {
            throw new HttpException(
              { statusCode: HttpStatus.CONFLICT, error: 'Conflict', message: 'Idempotency key reused with different payload' },
              HttpStatus.CONFLICT,
            );
          }
          const response = await this.getOrderById(existing.id, correlationId, manager);
          return { success: true, order: response, message: 'Order replayed (idempotent)', correlationId };
        }
      }

      const authorization = await this.paymentsService.authorize(expectedTotalCents / 100, correlationId, dto.paymentMethodToken);

      if (!authorization.success) {
        // Logged on the audit service's own connection so the decline survives
        // the checkout rollback (the decline is a real event even though the
        // order is not persisted).
        await this.auditService.logPaymentFailed(correlationId, dto.buyerId, expectedTotal, authorization.message);
        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            error: 'Payment Required',
            message: authorization.message,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const sortedProductIds = [...productIds].sort();
      const lockedProducts: Product[] = [];

      for (const productId of sortedProductIds) {
        const product = await (manager as any).createQueryBuilder(Product, 'product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: productId })
          .getOne();

        if (!product) {
          throw new NotFoundException('Product ' + productId + ' not found');
        }
        lockedProducts.push(product);
      }

      for (const item of dto.items) {
        const prod = lockedProducts.find((p) => p.id === item.productId);
        if (prod && prod.stockCount < item.quantity) {
          throw new BadRequestException('Insufficient stock for ' + prod.name + ': requested ' + item.quantity + ', available ' + prod.stockCount);
        }
      }

      for (const item of dto.items) {
        const p2 = lockedProducts.find((p) => p.id === item.productId);
        if (p2) {
          const newStock = p2.stockCount - item.quantity;
          await (manager as any).createQueryBuilder()
            .update(Product)
            .set({ stockCount: newStock })
            .where('id = :id', { id: item.productId })
            .execute();

          await this.auditService.logInventoryDecrement(
            correlationId,
            item.productId,
            p2.stockCount,
            newStock,
            item.quantity,
          );
        }
      }

      // Phase 2.2: human-facing order reference from the `order_number_seq`
      // Postgres sequence (`ORD-YYYYMMDD-NNNNNN`). Read inside the transaction
      // so the number is unique and committed atomically with the order.
      const [seqRow] = await manager.query("SELECT nextval('order_number_seq') AS seq");
      const orderNumber = this.formatOrderNumber(Number(seqRow.seq));

      // DUAL-WRITE: Write to new shipping_address field (Phase 7 expand-and-contract)
      // The old field (if any) remains for backward compatibility during transition
      const order = (manager.create as any)(Order, {
        buyerId: dto.buyerId,
        // Phase 1.1: for authenticated checkout, record the users.id so
        // GET /orders/me can resolve the buyer. NULL for guest checkouts.
        buyerUserId: buyerUserId ?? null,
        status: OrderStatus.PLACED,
        correlationId: correlationId,
        totalAmount: 0,
        shippingAddress: dto.shippingAddress || null,
        orderNumber,
        idempotencyKey: dto.idempotencyKey ?? null,
        idempotencyPayloadHash: dto.idempotencyKey ? this.normalizePayload(dto) : null,
      });

      const savedOrder = await (manager.save as any)(Order, order) as Order;

      let totalAmountCents = 0;
      const lineItems: OrderLineItem[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (product) {
          const pricingSnapshot = pricingSnapshots.get(item.productId);
          if (!pricingSnapshot) throw new BadRequestException('Pricing snapshot missing for product ' + item.productId);

          const effectiveUnitPrice = pricingSnapshot.effectiveUnitPriceCents / 100;
          const appliedPromoId = pricingSnapshot.promotion?.id ?? null;
          const appliedDiscountPercent = pricingSnapshot.promotion ? pricingSnapshot.discountPercent : null;
          const lineTotalCents = pricingSnapshot.effectiveUnitPriceCents * item.quantity;

          if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents > 2147483647) {
            throw new BadRequestException('Order line total exceeds supported USD-cent limits');
          }

          const lineTotal = lineTotalCents / 100;
          totalAmountCents += lineTotalCents;
          if (!Number.isSafeInteger(totalAmountCents) || totalAmountCents > 2147483647) {
            throw new BadRequestException('Checkout order total exceeds supported USD-cent limits');
          }

          const lineItem = (manager.create as any)(OrderLineItem, {
            orderId: savedOrder.id,
            productId: item.productId,
            vendorId: product.vendorId,
            quantity: item.quantity,
            unitPrice: pricingSnapshot.originalUnitPriceCents / 100,
            lineTotal,
            effectiveUnitPrice,
            promotionId: appliedPromoId,
            promotionDiscountPercent: appliedDiscountPercent,
            fulfillmentStatus: FulfillmentStatus.PENDING,
          });

          lineItems.push(lineItem);
        }
      }

      await (manager.save as any)(OrderLineItem, lineItems);

      // Category B: persist immutable promotion/funding snapshots in this
      // checkout transaction, after line-item IDs exist and before capture.
      for (let index = 0; index < dto.items.length; index++) {
        const item = dto.items[index];
        const pricingSnapshot = pricingSnapshots.get(item.productId);
        const lineItem = lineItems[index];
        const promotion = pricingSnapshot?.promotion;

        if (!pricingSnapshot || !lineItem) {
          throw new BadRequestException('Category B checkout snapshot is missing its line item');
        }

        if (!promotion) continue;

        if (promotion.approvalState !== 'APPROVED' || promotion.currency !== 'USD') {
          throw new BadRequestException('Only approved USD promotions can be snapshotted');
        }

        const fundingType = promotion.fundingType;
        const vendorPercent = promotion.vendorContributionPercent == null
          ? (fundingType === 'VENDOR_FUNDED' ? 100 : fundingType === 'MARKETPLACE_FUNDED' ? 0 : NaN)
          : Number(promotion.vendorContributionPercent);
        const marketplacePercent = promotion.marketplaceContributionPercent == null
          ? (fundingType === 'VENDOR_FUNDED' ? 0 : fundingType === 'MARKETPLACE_FUNDED' ? 100 : NaN)
          : Number(promotion.marketplaceContributionPercent);

        const capturedAmountCents = pricingSnapshot.effectiveUnitPriceCents * item.quantity;

        if (!this.promotionSnapshotService) {
          throw new Error('Promotion snapshot service is required for promoted checkout');
        }

        if (!this.promotionSnapshotService) {
          throw new Error('Promotion snapshot service is required for promoted checkout');
        }

        await this.promotionSnapshotService.persistSnapshot({
          promotionId: promotion.id,
          checkoutAttemptId: savedOrder.id,
          orderId: savedOrder.id,
          lineItemId: lineItem.id,
          currency: 'USD',
          fundingType,
          vendorContributionPercent: vendorPercent,
          marketplaceContributionPercent: marketplacePercent,
          approvalState: 'APPROVED',
          discountPercent: pricingSnapshot.discountPercent,
          originalUnitPriceCents: pricingSnapshot.originalUnitPriceCents,
          qty: item.quantity,
          capturedAmountCents,
        }, manager);
      }
      if (
        !Number.isSafeInteger(totalAmountCents) ||
        totalAmountCents !== expectedTotalCents
      ) {
        throw new BadRequestException('Checkout total does not reconcile to integer USD cents');
      }
      const totalAmount = totalAmountCents / 100;
      await manager.update(Order, { id: savedOrder.id }, { totalAmount: expectedTotalCents / 100 });

      // Phase 5.1: authorization already succeeded above (before stock moved);
      // record the capture against the order NOW that the order id exists. Same
      // transaction, so a crash before commit rolls back inventory + capture.
      await this.paymentsService.recordCapture(manager, savedOrder.id, expectedTotalCents / 100, authorization, correlationId);

      await this.auditService.logOrderCreated(correlationId, savedOrder.id, dto.buyerId, totalAmount);

      const response = await this.getOrderById(savedOrder.id, correlationId, manager);

      return {
        success: true,
        order: response,
        message: 'Order placed successfully',
        correlationId: correlationId,
      };
    });
  }

  async getOrderById(id: string, correlationId: string, manager?: any): Promise<OrderResponseDto> {
    const repo = manager ? manager.getRepository(Order) : this.orderRepository;
    const relations: FindOptionsRelations<Order> = { lineItems: { product: true, vendor: true } };
    const order = await repo.findOne({
      where: { id },
      relations: relations,
    });

    if (!order) {
      throw new NotFoundException('Order ' + id + ' not found');
    }

    return this.toOrderResponseDto(order);
  }

  async getOrdersByBuyer(buyerId: string): Promise<OrderResponseDto[]> {
    const relations: FindOptionsRelations<Order> = { lineItems: { product: true, vendor: true } };
    const orders = await this.orderRepository.find({
      where: { buyerId },
      relations: relations,
      order: { createdAt: 'DESC' },
    });

    return orders.map((o) => this.toOrderResponseDto(o));
  }

  /** Orders placed by the AUTHENTICATED buyer (Phase 2 — `GET /orders/me`). */
  async getOrdersForCurrentUser(userId: string): Promise<OrderResponseDto[]> {
    const relations: FindOptionsRelations<Order> = { lineItems: { product: true, vendor: true } };
    const orders = await this.orderRepository.find({
      where: { buyerUserId: userId },
      relations: relations,
      order: { createdAt: 'DESC' },
    });

    return orders.map((o) => this.toOrderResponseDto(o));
  }

  /** ADMIN/OPERATIONS audit trail for a single order (Phase 1.5). */
  async getOrderAudit(orderId: string): Promise<{ total: number; logs: AuditLog[] }> {
    const { logs, total } = await this.auditService.queryLogs({
      entityType: AuditEntityType.ORDER,
      entityId: orderId,
    });
    return { total, logs };
  }

  /** All orders containing a line item from the given vendor (Phase 2). */
  async getOrdersByVendor(vendorId: string): Promise<OrderResponseDto[]> {
    const rows = await this.lineItemRepository
      .createQueryBuilder('lineItem')
      .select('DISTINCT lineItem.orderId', 'orderId')
      .where('lineItem.vendorId = :vendorId', { vendorId })
      .getRawMany();

    if (!rows || rows.length === 0) {
      return [];
    }

    const orderIds = rows.map((r) => r.orderId);
    const relations: FindOptionsRelations<Order> = { lineItems: { product: true, vendor: true } };
    const orders = await this.orderRepository.find({
      where: orderIds.map((id) => ({ id })),
      relations: relations,
      order: { createdAt: 'DESC' },
    });

    return orders.map((o) => this.toOrderResponseDto(o));
  }

  /**
   * Advance an order along the lifecycle (Phase 2 — vendor/ops actions).
   *
   * Valid transitions:
   *   CONFIRM  placed -> confirmed
   *   FULFILL  confirmed -> fulfilling
   *   SHIP     fulfilling -> fulfilled
   *   CANCEL   (any non-final status) -> cancelled, via cancelOrder() stock restore.
   *
   * `actorId` (the authenticated user) is recorded on the status-change audit.
   */
  async transitionOrder(
    orderId: string,
    dto: TransitionOrderDto,
    correlationId: string,
    actorId?: string,
  ): Promise<OrderResponseDto> {
    this.logger.log('Transitioning order ' + orderId + ' with action ' + dto.action, OrdersService.name, correlationId);

    // CANCEL reuses the full cancel flow (inventory restore + line-item failed).
    if (dto.action === 'CANCEL') {
      const cancelled = await this.cancelOrder(orderId, correlationId);
      return cancelled;
    }

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order missing not found');
    }

    const nextStatus = this.allowedTransitions[dto.action][order.status];
    if (!nextStatus) {
      throw new BadRequestException('Illegal transition ' + dto.action + ' from current status ' + order.status);
    }

    // For provider-backed orders, confirmation requires captured payment; preserve legacy orders with no payment record.
    if (nextStatus === OrderStatus.CONFIRMED) {
      const payments = await this.paymentsService.findByOrderId(orderId);
      const hasCaptured = payments.some(p => p.status === PaymentStatus.CAPTURED);
      const hasLegacyNoPayment = payments.length === 0;
      if (!hasCaptured && !hasLegacyNoPayment) {
        throw new BadRequestException('Order cannot be confirmed: payment is not captured.');
      }
    }
    await this.orderRepository.update(orderId, { status: nextStatus });
    await this.auditService.logOrderStatusChange(correlationId, orderId, order.status, nextStatus, actorId);

    this.logger.log('Order ' + orderId + ' transitioned ' + order.status + ' -> ' + nextStatus, OrdersService.name, correlationId);
    return this.getOrderById(orderId, correlationId);
  }

  async cancelOrder(orderId: string, correlationId: string): Promise<OrderResponseDto> {
    this.logger.log('Cancelling order ' + orderId, OrdersService.name, correlationId);

    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { lineItems: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order ' + orderId + ' not found');
      }

      if (order.status === OrderStatus.FULFILLED) {
        throw new BadRequestException('Cannot cancel order in status: fulfilled');
      }

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Order is already cancelled');
      }

      const previousStatus = order.status;
      const itemsToRestore = order.lineItems.filter(
        (item) => item.fulfillmentStatus === FulfillmentStatus.PENDING || item.fulfillmentStatus === FulfillmentStatus.SYNCING,
      );

      // Phase 1.6: every write below shares ONE transaction. A crash mid-cancel
      // rolls back all partial stock restores and the status flip together —
      // previously a failed restore left stock half-restored with the order active.
      for (const item of itemsToRestore) {
        await this.inventoryService.restoreStock(
          item.productId,
          item.quantity,
          correlationId,
          'Order cancellation',
          manager,
        );
      }

      await manager.update(Order, { id: orderId }, { status: OrderStatus.CANCELLED });
      await manager.update(
        OrderLineItem,
        { orderId },
        { fulfillmentStatus: FulfillmentStatus.FAILED, failureReason: 'Order cancelled' },
      );

      // Phase 5.1: reverse the captured authorization. Passed the same manager
      // so the refund commits atomically with the cancellation; a pre-payment
      // order has no auth row and this is a no-op.
      await this.paymentsService.refund(orderId, correlationId, manager);

      await this.auditService.logOrderStatusChange(correlationId, orderId, previousStatus, OrderStatus.CANCELLED);

      const refreshed = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { lineItems: { product: true, vendor: true } },
      });
      return this.toOrderResponseDto(refreshed as Order);
    });
  }

  /**
   * Explicit refund of an order's captured payment (Phase 5.1) — for customers
   * refunded outside the cancellation flow. Idempotent: already-refunded rows
   * return unchanged; orders without a payment return null.
   */
  async refundOrder(
    orderId: string,
    correlationId: string,
  ): Promise<PaymentAuthorization | null> {
    return this.paymentsService.refund(orderId, correlationId);
  }

  /** Normalized deterministic fingerprint of checkout payload for idempotency. */
  private normalizePayload(dto: CheckoutDto): string {
    const sortedItems = [...dto.items].sort((a, b) => a.productId.localeCompare(b.productId)).map(i => i.productId + ':' + i.quantity).join('|');
    return dto.buyerId + '|' + sortedItems + '|' + (dto.shippingAddress || '') + '|' + (dto.paymentMethodToken || '') + '|' + (dto.idempotencyKey || '');
  }

  /** ORD-YYYYMMDD-NNNNNN, human-facing plus sequence (Phase 2.2). */
  private formatOrderNumber(seq: number): string {
    const now = new Date();
    const yyyymmdd =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    return 'ORD-' + yyyymmdd + '-' + String(seq).padStart(6, '0');
  }

  private toOrderResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber ?? null,
      buyerId: order.buyerId,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      correlationId: order.correlationId || '',
      shippingAddress: order.shippingAddress || '', // CUT-OVER: Read from new field
      lineItems: (order.lineItems || []).map((item) => this.toLineItemResponseDto(item)),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private toLineItemResponseDto(item: OrderLineItem): OrderLineItemResponseDto {
    return {
      id: item.id,
      productId: item.productId,
      productName: (item.product && item.product.name) ? item.product.name : 'Unknown',
      vendorId: item.vendorId,
      vendorName: item.vendor ? item.vendor.name : 'Unknown',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      fulfillmentStatus: item.fulfillmentStatus,
      vendorReference: item.vendorReference,
      failureReason: item.failureReason,
      // Persisted promotion snapshot — never recalculated from current promotions.
      promotionId: item.promotionId ?? null,
      promotionDiscountPercent: item.promotionDiscountPercent ?? null,
      effectiveUnitPrice: item.effectiveUnitPrice ?? null,
      originalUnitPrice: Number(item.unitPrice),
    };
  }
}
