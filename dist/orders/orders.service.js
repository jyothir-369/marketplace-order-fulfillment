"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../common/entities/order.entity");
const order_line_item_entity_1 = require("../common/entities/order-line-item.entity");
const product_entity_1 = require("../common/entities/product.entity");
const inventory_service_1 = require("../inventory/inventory.service");
const audit_1 = require("../common/audit");
const vendor_queue_service_1 = require("../fulfillment/vendor-queue.service");
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(orderRepository, lineItemRepository, productRepository, dataSource, inventoryService, auditService, vendorQueueService) {
        this.orderRepository = orderRepository;
        this.lineItemRepository = lineItemRepository;
        this.productRepository = productRepository;
        this.dataSource = dataSource;
        this.inventoryService = inventoryService;
        this.auditService = auditService;
        this.vendorQueueService = vendorQueueService;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async checkout(dto, correlationId) {
        this.logger.log('Starting checkout for buyer ' + dto.buyerId + ' with ' + dto.items.length + ' items', OrdersService_1.name, correlationId);
        const productIds = dto.items.map((i) => i.productId);
        const products = await this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.vendor', 'vendor')
            .where('product.id IN (:...ids)', { ids: productIds })
            .getMany();
        if (products.length !== productIds.length) {
            throw new common_1.BadRequestException('Products not found');
        }
        const productMap = new Map();
        products.forEach((p) => productMap.set(p.id, p));
        const result = await this.dataSource.transaction(async (manager) => {
            const sortedProductIds = [...productIds].sort();
            const lockedProducts = [];
            for (const productId of sortedProductIds) {
                const product = await manager.createQueryBuilder(product_entity_1.Product, 'product')
                    .setLock('pessimistic_write')
                    .where('product.id = :id', { id: productId })
                    .getOne();
                if (!product) {
                    throw new common_1.NotFoundException('Product ' + productId + ' not found');
                }
                lockedProducts.push(product);
            }
            for (const item of dto.items) {
                const prod = lockedProducts.find((p) => p.id === item.productId);
                if (prod && prod.stockCount < item.quantity) {
                    throw new common_1.BadRequestException('Insufficient stock for ' + prod.name + ': requested ' + item.quantity + ', available ' + prod.stockCount);
                }
            }
            for (const item of dto.items) {
                const p2 = lockedProducts.find((p) => p.id === item.productId);
                if (p2) {
                    const newStock = p2.stockCount - item.quantity;
                    await manager.createQueryBuilder(product_entity_1.Product, 'product')
                        .update()
                        .set({ stockCount: newStock })
                        .where('id = :id', { id: item.productId })
                        .execute();
                    await this.auditService.logInventoryDecrement(correlationId, item.productId, p2.stockCount, newStock, item.quantity);
                }
            }
            const order = manager.create(order_entity_1.Order, {
                buyerId: dto.buyerId,
                status: order_entity_1.OrderStatus.PLACED,
                correlationId: correlationId,
                totalAmount: 0,
                shippingAddress: dto.shippingAddress || null,
            });
            const savedOrder = await manager.save(order_entity_1.Order, order);
            let totalAmount = 0;
            const lineItems = [];
            for (const item of dto.items) {
                const product = productMap.get(item.productId);
                if (product) {
                    const unitPrice = Number(product.price);
                    const lineTotal = unitPrice * item.quantity;
                    totalAmount += lineTotal;
                    const lineItem = manager.create(order_line_item_entity_1.OrderLineItem, {
                        orderId: savedOrder.id,
                        productId: item.productId,
                        vendorId: product.vendorId,
                        quantity: item.quantity,
                        unitPrice: unitPrice,
                        lineTotal: lineTotal,
                        fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.PENDING,
                    });
                    lineItems.push(lineItem);
                }
            }
            await manager.save(order_line_item_entity_1.OrderLineItem, lineItems);
            await manager.update(order_entity_1.Order, savedOrder.id, { totalAmount: totalAmount });
            await this.auditService.logOrderCreated(correlationId, savedOrder.id, dto.buyerId, totalAmount);
            this.logger.log('Order ' + savedOrder.id + ' created with total ' + totalAmount, OrdersService_1.name, correlationId);
            return { savedOrder, lineItems };
        });
        for (const item of result.lineItems) {
            try {
                await this.vendorQueueService.addJobToVendorQueue(item.vendorId, {
                    jobId: 'sync-' + item.id,
                    orderLineItemId: item.id,
                    vendorId: item.vendorId,
                    correlationId: correlationId,
                });
            }
            catch (error) {
                this.logger.error('Failed to enqueue fulfillment job for line item ' + item.id, error, OrdersService_1.name, correlationId);
                await this.lineItemRepository.update(item.id, {
                    fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.FAILED,
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
    async getOrderById(id, correlationId) {
        const relations = { lineItems: { product: true, vendor: true } };
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: relations,
        });
        if (!order) {
            throw new common_1.NotFoundException('Order ' + id + ' not found');
        }
        return this.toOrderResponseDto(order);
    }
    async getOrdersByBuyer(buyerId) {
        const relations = { lineItems: { product: true, vendor: true } };
        const orders = await this.orderRepository.find({
            where: { buyerId },
            relations: relations,
            order: { createdAt: 'DESC' },
        });
        return orders.map((o) => this.toOrderResponseDto(o));
    }
    async cancelOrder(orderId, correlationId) {
        this.logger.log('Cancelling order ' + orderId, OrdersService_1.name, correlationId);
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: { lineItems: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order ' + orderId + ' not found');
        }
        const validCancelStatuses = [order_entity_1.OrderStatus.PLACED, order_entity_1.OrderStatus.CONFIRMED, order_entity_1.OrderStatus.FULFILLING];
        if (!validCancelStatuses.includes(order.status)) {
            throw new common_1.BadRequestException('Cannot cancel order in status: ' + order.status);
        }
        const previousStatus = order.status;
        const itemsToRestore = order.lineItems.filter((item) => item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.PENDING || item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.SYNCING);
        for (const item of itemsToRestore) {
            await this.inventoryService.restoreStock(item.productId, item.quantity, correlationId, 'Order cancellation');
        }
        await this.orderRepository.update(orderId, { status: order_entity_1.OrderStatus.CANCELLED });
        await this.lineItemRepository.update({ orderId }, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.FAILED, failureReason: 'Order cancelled' });
        await this.auditService.logOrderStatusChange(correlationId, orderId, previousStatus, order_entity_1.OrderStatus.CANCELLED);
        return this.getOrderById(orderId, correlationId);
    }
    toOrderResponseDto(order) {
        return {
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
    toLineItemResponseDto(item) {
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
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_line_item_entity_1.OrderLineItem)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        inventory_service_1.InventoryService,
        audit_1.AuditService,
        vendor_queue_service_1.VendorQueueService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map