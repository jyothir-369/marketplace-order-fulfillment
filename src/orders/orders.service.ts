import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsRelations } from 'typeorm';
import { Order, OrderStatus } from '../common/entities/order.entity';
import { OrderLineItem, FulfillmentStatus } from '../common/entities/order-line-item.entity';
import { Product } from '../common/entities/product.entity';
import { CheckoutDto, CheckoutResponseDto, OrderResponseDto, OrderLineItemResponseDto } from './dto/orders.dto';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../common/audit';

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
  ) {}

  async checkout(dto: CheckoutDto, correlationId: string): Promise<CheckoutResponseDto> {
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
        const product = await manager.createQueryBuilder(Product, 'product')
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
          await manager.createQueryBuilder(Product, 'product')
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

      // DUAL-WRITE: Write to new shipping_address field (Phase 7 expand-and-contract)
      // The old field (if any) remains for backward compatibility during transition
      const order = manager.create(Order, {
        buyerId: dto.buyerId,
        status: OrderStatus.PLACED,
        correlationId: correlationId,
        totalAmount: 0,
        shippingAddress: dto.shippingAddress || null, // New field from Phase 7
      });

      const savedOrder = await manager.save(Order, order);

      let totalAmount = 0;
      const lineItems: OrderLineItem[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (product) {
          const unitPrice = Number(product.price);
          const lineTotal = unitPrice * item.quantity;
          totalAmount += lineTotal;

          const lineItem = manager.create(OrderLineItem, {
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

      await manager.save(OrderLineItem, lineItems);
      await manager.update(Order, savedOrder.id, { totalAmount: totalAmount });

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

  async cancelOrder(orderId: string, correlationId: string): Promise<OrderResponseDto> {
    this.logger.log('Cancelling order ' + orderId, OrdersService.name, correlationId);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { lineItems: true },
    });

    if (!order) {
      throw new NotFoundException('Order ' + orderId + ' not found');
    }

    if (order.status === OrderStatus.FULFILLED) {
      throw new BadRequestException('Cannot cancel a fulfilled order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    const previousStatus = order.status;
    const itemsToRestore = order.lineItems.filter(
      (item) => item.fulfillmentStatus === FulfillmentStatus.PENDING || item.fulfillmentStatus === FulfillmentStatus.SYNCING,
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
    await this.lineItemRepository.update({ orderId }, { fulfillmentStatus: FulfillmentStatus.FAILED, failureReason: 'Order cancelled' });

    await this.auditService.logOrderStatusChange(correlationId, orderId, previousStatus, OrderStatus.CANCELLED);

    return this.getOrderById(orderId, correlationId);
  }

  private toOrderResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
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
