import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsRelations } from 'typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import {
  CheckoutDto,
  CheckoutResponseDto,
  OrderResponseDto,
  OrderLineItemResponseDto,
  TransitionOrderDto,
  OrderTransitionAction,
  PaginatedOrdersQueryDto,
  PaginatedOrdersResponseDto,
} from './dto/orders.dto';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../common/audit/audit.service';
import { VendorQueueService } from '../fulfillment/vendor-queue.service';

const TRANSITION_TARGET: Record<OrderTransitionAction, { from: OrderStatus[]; to: OrderStatus }> = {
  CONFIRM: { from: [OrderStatus.PLACED], to: OrderStatus.CONFIRMED },
  FULFILL: { from: [OrderStatus.CONFIRMED], to: OrderStatus.FULFILLING },
  SHIP:    { from: [OrderStatus.FULFILLING], to: OrderStatus.FULFILLED },
  CANCEL:  { from: [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.FULFILLING], to: OrderStatus.CANCELLED },
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
    private readonly vendorQueueService: VendorQueueService,
  ) {}

  async checkout(dto: CheckoutDto, correlationId: string): Promise<CheckoutResponseDto> {

    if (dto.idempotencyKey) {
      const existing = await this.orderRepository.findOne({
        where: { clientReferenceId: dto.idempotencyKey },
      });
      if (existing) {
        this.logger.log(
          `Idempotent checkout replay for key ${dto.idempotencyKey} (order ${existing.id})`,
          OrdersService.name,
          correlationId,
        );
        return {
          success: true,
          order: await this.getOrderById(existing.id, correlationId),
          message: 'Order already placed',
          correlationId: correlationId,
        };
      }
    }
    this.logger.log(
      `Starting checkout for buyer ${dto.buyerId} with ${dto.items.length} items`,
      OrdersService.name,
      correlationId,
    );

    const dedupedIds = new Set(dto.items.map((i) => i.productId));
    if (dedupedIds.size !== dto.items.length) {
      throw new BadRequestException('Duplicate product line items are not allowed');
    }

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

    const result = await this.dataSource.transaction(async (manager) => {
      // Acquire pessimistic locks in sorted order to prevent deadlocks
      const sortedProductIds = [...productIds].sort();
      const lockedProducts: Product[] = [];

      for (const productId of sortedProductIds) {
        const product = await manager
          .createQueryBuilder(Product, 'product')
          .setLock('pessimistic_write')
          .where('product.id = :id', { id: productId })
          .getOne();

        if (!product) {
          throw new NotFoundException(`Product ${productId} not found`);
        }
        lockedProducts.push(product);
      }

      // Validate stock availability via shared inventory guard
      const availability = await this.inventoryService.validateStockAvailability(
        dto.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        correlationId,
        manager,
      );
      if (!availability.available) {
        const conflicting = availability.items
          .filter((a) => a.availableQuantity < a.requestedQuantity)
          .map((a) => a.productId);
        throw new ConflictException({
          statusCode: 409,
          message: 'Insufficient stock for one or more items',
          error: 'Conflict',
          conflictingProductIds: conflicting,
        });
      }

      // Decrement stock
      for (const item of dto.items) {
        const p2 = lockedProducts.find((p) => p.id === item.productId);
        if (p2) {
          const newStock = p2.stockCount - item.quantity;
          await manager
            .createQueryBuilder(Product, 'product')
            .update()
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

      // Create order — orderNumber is auto-generated via @BeforeInsert
      const order = manager.create(Order, {
        buyerId: dto.buyerId,
        status: OrderStatus.PLACED,
        correlationId: correlationId,
        totalAmount: 0,
        shippingAddress: dto.shippingAddress || null,
        clientReferenceId: dto.idempotencyKey || null,
      });

      const savedOrder = await manager.save(Order, order);

      // Build line items
      let totalAmount = 0;
      const lineItems: OrderLineItem[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (product) {
          const unitPrice = Number(product.price);
          const lineTotal = unitPrice * item.quantity;
          totalAmount += lineTotal;

          lineItems.push(
            manager.create(OrderLineItem, {
              orderId: savedOrder.id,
              productId: item.productId,
              vendorId: product.vendorId,
              quantity: item.quantity,
              unitPrice: unitPrice,
              lineTotal: lineTotal,
              fulfillmentStatus: FulfillmentStatus.PENDING,
            }),
          );
        }
      }

      await manager.save(OrderLineItem, lineItems);
      await manager.update(Order, savedOrder.id, { totalAmount: totalAmount });

      await this.auditService.logOrderCreated(
        correlationId,
        savedOrder.id,
        dto.buyerId,
        totalAmount,
      );

      this.logger.log(
        `Order ${savedOrder.id} (${savedOrder.orderNumber}) created with total ${totalAmount}`,
        OrdersService.name,
        correlationId,
      );

      return { savedOrder, lineItems };
    });

    // Post-transaction: enqueue vendor sync jobs
    for (const item of result.lineItems) {
      try {
        await this.vendorQueueService.addJobToVendorQueue(item.vendorId, {
          jobId: 'sync-' + item.id,
          orderLineItemId: item.id,
          vendorId: item.vendorId,
          correlationId: correlationId,
        });
      } catch (error) {
        this.logger.error(
          `Failed to enqueue fulfillment job for line item ${item.id}`,
          error instanceof Error ? error.stack : undefined,
          OrdersService.name,
          correlationId,
        );
        await this.lineItemRepository.update(item.id, {
          fulfillmentStatus: FulfillmentStatus.FAILED,
          failureReason: 'Failed to enqueue fulfillment job',
        });
      }
    }

    const response = await this.getOrderById(result.savedOrder.id, correlationId);

    return {
      success: true,
      order: response,
      message: 'Order placed successfully',
      correlationId: correlationId,
    };
  }

  async getOrderById(id: string, correlationId: string): Promise<OrderResponseDto> {
    const relations: FindOptionsRelations<Order> = { lineItems: { product: true, vendor: true } };
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: relations,
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return this.toOrderResponseDto(order);
  }

  /**
   * Global paginated order listing — used by the admin portal.
   */
  async getOrdersPaginated(
    query: PaginatedOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status as OrderStatus;
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: { lineItems: { product: true, vendor: true } },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      total,
      page,
      limit,
      orders: orders.map((o) => this.toOrderResponseDto(o)),
    };
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

  async getOrdersByVendor(vendorId: string): Promise<OrderResponseDto[]> {
    const orderIds = await this.lineItemRepository
      .createQueryBuilder('lineItem')
      .select('DISTINCT lineItem.orderId', 'orderId')
      .where('lineItem.vendorId = :vendorId', { vendorId })
      .getRawMany<{ orderId: string }>();

    if (orderIds.length === 0) {
      return [];
    }

    const relations: FindOptionsRelations<Order> = { lineItems: { product: true, vendor: true } };
    const orders = await this.orderRepository.find({
      where: orderIds.map((row) => ({ id: row.orderId })),
      relations: relations,
      order: { createdAt: 'DESC' },
    });

    return orders.map((o) => this.toOrderResponseDto(o));
  }

  async transitionOrder(
    orderId: string,
    dto: TransitionOrderDto,
    correlationId: string,
    actorId?: string,
  ): Promise<OrderResponseDto> {
    this.logger.log(
      `Transitioning order ${orderId} via ${dto.action}` +
        (dto.reason ? ` (reason: ${dto.reason})` : ''),
      OrdersService.name,
      correlationId,
    );

    if (dto.action === 'CANCEL') {
      return this.cancelOrder(orderId, correlationId);
    }

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const rule = TRANSITION_TARGET[dto.action];
    if (!rule.from.includes(order.status)) {
      throw new BadRequestException(
        `Illegal transition ${dto.action}: order is in status '${order.status}', expected one of [${rule.from.join(', ')}]`,
      );
    }

    const previousStatus = order.status;
    await this.orderRepository.update(orderId, { status: rule.to });
    await this.auditService.logOrderStatusChange(
      correlationId,
      orderId,
      previousStatus,
      rule.to,
      actorId,
    );

    return this.getOrderById(orderId, correlationId);
  }

  async cancelOrder(orderId: string, correlationId: string): Promise<OrderResponseDto> {
    this.logger.log(`Cancelling order ${orderId}`, OrdersService.name, correlationId);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { lineItems: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const validCancelStatuses = [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.FULFILLING];
    if (!validCancelStatuses.includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order in status: ${order.status}`);
    }

    const previousStatus = order.status;
    const itemsToRestore = order.lineItems.filter(
      (item) =>
        item.fulfillmentStatus === FulfillmentStatus.PENDING ||
        item.fulfillmentStatus === FulfillmentStatus.SYNCING,
    );

    for (const item of itemsToRestore) {
      await this.inventoryService.restoreStock(
        item.productId,
        item.quantity,
        correlationId,
        'Order cancellation',
      );
    }

    await this.orderRepository.update(orderId, { status: OrderStatus.CANCELLED });
    await this.lineItemRepository.update(
      { orderId },
      { fulfillmentStatus: FulfillmentStatus.FAILED, failureReason: 'Order cancelled' },
    );

    await this.auditService.logOrderStatusChange(
      correlationId,
      orderId,
      previousStatus,
      OrderStatus.CANCELLED,
    );

    return this.getOrderById(orderId, correlationId);
  }

  private toOrderResponseDto(order: Order): OrderResponseDto {
    return {
      orderNumber: order.orderNumber || 'UNKNOWN',
      id: order.id,
      buyerId: order.buyerId,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      correlationId: order.correlationId || '',
      shippingAddress: order.shippingAddress || '',
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