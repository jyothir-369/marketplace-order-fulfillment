import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsRelations } from 'typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { CheckoutDto, CheckoutResponseDto, OrderResponseDto, OrderLineItemResponseDto, TransitionOrderDto, OrderTransitionAction } from './dto/orders.dto';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService, AuditLog, AuditEntityType } from '../common/audit';

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
    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
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

    return this.dataSource.transaction(async (manager) => {
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
        shippingAddress: dto.shippingAddress || null, // New field from Phase 7
        orderNumber,
      });

      const savedOrder = await (manager.save as any)(Order, order) as Order;

      let totalAmount = 0;
      const lineItems: OrderLineItem[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (product) {
          const unitPrice = Number(product.price);
          const lineTotal = unitPrice * item.quantity;
          totalAmount += lineTotal;

          const lineItem = (manager.create as any)(OrderLineItem, {
            orderId: savedOrder.id,
            productId: item.productId,
            vendorId: product.vendorId,
            quantity: item.quantity,
            unitPrice: unitPrice,
            lineTotal: lineTotal,
            fulfillmentStatus: FulfillmentStatus.PENDING,
          });

          lineItems.push(lineItem);
        }
      }

      await (manager.save as any)(OrderLineItem, lineItems);
      await manager.update(Order, { id: savedOrder.id }, { totalAmount: totalAmount });

      await this.auditService.logOrderCreated(correlationId, savedOrder.id, dto.buyerId, totalAmount);

      this.logger.log('Order ' + savedOrder.id + ' created with total ' + totalAmount, OrdersService.name, correlationId);

      const response = await this.getOrderById(savedOrder.id, correlationId);

      return {
        success: true,
        order: response,
        message: 'Order placed successfully',
        correlationId: correlationId,
      };
    });
  }

  async getOrderById(id: string, correlationId: string): Promise<OrderResponseDto> {
    const relations: FindOptionsRelations<Order> = { lineItems: { product: true, vendor: true } };
    const order = await this.orderRepository.findOne({
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

      await this.auditService.logOrderStatusChange(correlationId, orderId, previousStatus, OrderStatus.CANCELLED);

      const refreshed = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { lineItems: { product: true, vendor: true } },
      });
      return this.toOrderResponseDto(refreshed as Order);
    });
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
      productName: item.product ? item.product.name : 'Unknown',
      vendorId: item.vendorId,
      vendorName: item.vendor ? item.vendor.name : 'Unknown',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      fulfillmentStatus: item.fulfillmentStatus,
      vendorReference: item.vendorReference,
      failureReason: item.failureReason,
    };
  }
}