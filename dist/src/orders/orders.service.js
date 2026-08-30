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
const vendor_entity_1 = require("../common/entities/vendor.entity");
const inventory_service_1 = require("../inventory/inventory.service");
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(orderRepository, lineItemRepository, productRepository, vendorRepository, dataSource, inventoryService) {
        this.orderRepository = orderRepository;
        this.lineItemRepository = lineItemRepository;
        this.productRepository = productRepository;
        this.vendorRepository = vendorRepository;
        this.dataSource = dataSource;
        this.inventoryService = inventoryService;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async checkout(dto, correlationId) {
        this.logger.log('Starting checkout for buyer ' + dto.buyerId + ' with ' + dto.items.length + ' items', OrdersService_1.name, correlationId);
        var productIds = dto.items.map(function (i) { return i.productId; });
        var products = await this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.vendor', 'vendor')
            .where('product.id IN (:...ids)', { ids: productIds })
            .getMany();
        if (products.length !== productIds.length) {
            throw new common_1.BadRequestException('Products not found');
        }
        var productMap = new Map();
        products.forEach(function (p) { productMap.set(p.id, p); });
        var self = this;
        return this.dataSource.transaction(async function (manager) {
            var sortedProductIds = productIds.slice().sort();
            var lockedProducts = [];
            for (var i = 0; i < sortedProductIds.length; i++) {
                var productId = sortedProductIds[i];
                var product = await manager.createQueryBuilder(product_entity_1.Product, 'product')
                    .setLock('pessimistic_write')
                    .where('product.id = :id', { id: productId })
                    .getOne();
                if (!product) {
                    throw new common_1.NotFoundException('Product ' + productId + ' not found');
                }
                lockedProducts.push(product);
            }
            for (var j = 0; j < dto.items.length; j++) {
                var item = dto.items[j];
                var prod = lockedProducts.find(function (p) { return p.id === item.productId; });
                if (prod.stockCount < item.quantity) {
                    throw new common_1.BadRequestException('Insufficient stock for ' + prod.name + ': requested ' + item.quantity + ', available ' + prod.stockCount);
                }
            }
            for (var k = 0; k < dto.items.length; k++) {
                var it = dto.items[k];
                var p2 = lockedProducts.find(function (p) { return p.id === it.productId; });
                var newStock = p2.stockCount - it.quantity;
                await manager.createQueryBuilder()
                    .update(product_entity_1.Product)
                    .set({ stockCount: newStock })
                    .where('id = :id', { id: it.productId })
                    .execute();
            }
            var order = manager.create(order_entity_1.Order, {
                buyerId: dto.buyerId,
                status: order_entity_1.OrderStatus.PLACED,
                correlationId: correlationId,
                totalAmount: 0,
            });
            var savedOrder = await manager.save(order_entity_1.Order, order);
            var totalAmount = 0;
            var lineItems = [];
            for (var m = 0; m < dto.items.length; m++) {
                var itemDto = dto.items[m];
                var product = productMap.get(itemDto.productId);
                var unitPrice = Number(product.price);
                var lineTotal = unitPrice * itemDto.quantity;
                totalAmount += lineTotal;
                var lineItem = manager.create(order_line_item_entity_1.OrderLineItem, {
                    orderId: savedOrder.id,
                    productId: itemDto.productId,
                    vendorId: product.vendorId,
                    quantity: itemDto.quantity,
                    unitPrice: unitPrice,
                    lineTotal: lineTotal,
                    fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.PENDING,
                });
                lineItems.push(lineItem);
            }
            await manager.save(order_line_item_entity_1.OrderLineItem, lineItems);
            await manager.update(order_entity_1.Order, savedOrder.id, { totalAmount: totalAmount });
            self.logger.log('Order ' + savedOrder.id + ' created with total ' + totalAmount, OrdersService_1.name, correlationId);
            var response = await self.getOrderById(savedOrder.id, correlationId);
            return {
                success: true,
                order: response,
                message: 'Order placed successfully',
                correlationId: correlationId,
            };
        });
    }
    async getOrderById(id, correlationId) {
        var order = await this.orderRepository.findOne({
            where: { id: id },
            relations: ['lineItems', 'lineItems.product', 'lineItems.vendor'],
        });
        if (!order) {
            throw new common_1.NotFoundException('Order ' + id + ' not found');
        }
        return this.toOrderResponseDto(order);
    }
    async getOrdersByBuyer(buyerId) {
        var orders = await this.orderRepository.find({
            where: { buyerId: buyerId },
            relations: ['lineItems', 'lineItems.product', 'lineItems.vendor'],
            order: { createdAt: 'DESC' },
        });
        return orders.map(function (o) { return this.toOrderResponseDto(o); }.bind(this));
    }
    async cancelOrder(orderId, correlationId) {
        this.logger.log('Cancelling order ' + orderId, OrdersService_1.name, correlationId);
        var order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['lineItems'],
        });
        if (!order) {
            throw new common_1.NotFoundException('Order ' + orderId + ' not found');
        }
        if (order.status === order_entity_1.OrderStatus.FULFILLED) {
            throw new common_1.BadRequestException('Cannot cancel a fulfilled order');
        }
        if (order.status === order_entity_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Order is already cancelled');
        }
        var itemsToRestore = order.lineItems.filter(function (item) {
            return item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.PENDING || item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.SYNCING;
        });
        for (var i = 0; i < itemsToRestore.length; i++) {
            var item = itemsToRestore[i];
            await this.inventoryService.restoreStock(item.productId, item.quantity, correlationId);
        }
        await this.orderRepository.update(orderId, { status: order_entity_1.OrderStatus.CANCELLED });
        await this.lineItemRepository.update({ orderId: orderId }, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.FAILED, failureReason: 'Order cancelled' });
        return this.getOrderById(orderId, correlationId);
    }
    toOrderResponseDto(order) {
        var self = this;
        return {
            id: order.id,
            buyerId: order.buyerId,
            status: order.status,
            totalAmount: Number(order.totalAmount),
            correlationId: order.correlationId || '',
            lineItems: (order.lineItems || []).map(function (item) { return self.toLineItemResponseDto(item); }),
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
    __param(3, (0, typeorm_1.InjectRepository)(vendor_entity_1.Vendor)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, typeorm_2.DataSource, inventory_service_1.InventoryService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map