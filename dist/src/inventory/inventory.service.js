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
var InventoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("../common/entities/product.entity");
let InventoryService = InventoryService_1 = class InventoryService {
    constructor(productRepository, dataSource) {
        this.productRepository = productRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(InventoryService_1.name);
    }
    async decrementStock(dto, correlationId) {
        this.logger.log('Decrementing stock for product ' + dto.productId + ' by ' + dto.quantity, InventoryService_1.name, correlationId);
        var self = this;
        return this.dataSource.transaction(function (manager) {
            return manager.createQueryBuilder(product_entity_1.Product, 'product')
                .setLock('pessimistic_write')
                .where('product.id = :id', { id: dto.productId })
                .getOne()
                .then(function (product) {
                if (!product) {
                    throw new common_1.BadRequestException('Product ' + dto.productId + ' not found');
                }
                if (!product.isActive) {
                    return {
                        success: false,
                        productId: dto.productId,
                        previousStock: product.stockCount,
                        newStock: product.stockCount,
                        requestedQuantity: dto.quantity,
                        message: 'Product is not active',
                    };
                }
                if (product.stockCount < dto.quantity) {
                    self.logger.warn('Insufficient stock for product ' + dto.productId + ': requested ' + dto.quantity + ', available ' + product.stockCount, InventoryService_1.name, correlationId);
                    return {
                        success: false,
                        productId: dto.productId,
                        previousStock: product.stockCount,
                        newStock: product.stockCount,
                        requestedQuantity: dto.quantity,
                        message: 'Insufficient stock: requested ' + dto.quantity + ', available ' + product.stockCount,
                    };
                }
                var previousStock = product.stockCount;
                var newStock = previousStock - dto.quantity;
                return manager.createQueryBuilder()
                    .update(product_entity_1.Product)
                    .set({ stockCount: newStock })
                    .where('id = :id', { id: dto.productId })
                    .execute()
                    .then(function () {
                    self.logger.log('Stock decremented for product ' + dto.productId + ': ' + previousStock + ' -> ' + newStock, InventoryService_1.name, correlationId);
                    return {
                        success: true,
                        productId: dto.productId,
                        previousStock: previousStock,
                        newStock: newStock,
                        requestedQuantity: dto.quantity,
                    };
                });
            });
        });
    }
    async getStockInfo(productId) {
        var product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            throw new common_1.BadRequestException('Product ' + productId + ' not found');
        }
        return {
            productId: product.id,
            currentStock: product.stockCount,
            isAvailable: product.isActive && product.stockCount > 0,
        };
    }
    async restoreStock(productId, quantity, correlationId) {
        this.logger.log('Restoring stock for product ' + productId + ' by ' + quantity, InventoryService_1.name, correlationId);
        var self = this;
        return this.dataSource.transaction(function (manager) {
            return manager.createQueryBuilder(product_entity_1.Product, 'product')
                .setLock('pessimistic_write')
                .where('product.id = :id', { id: productId })
                .getOne()
                .then(function (product) {
                if (!product) {
                    throw new common_1.BadRequestException('Product ' + productId + ' not found');
                }
                var previousStock = product.stockCount;
                var newStock = previousStock + quantity;
                return manager.createQueryBuilder()
                    .update(product_entity_1.Product)
                    .set({ stockCount: newStock })
                    .where('id = :id', { id: productId })
                    .execute()
                    .then(function () {
                    self.logger.log('Stock restored for product ' + productId + ': ' + previousStock + ' -> ' + newStock, InventoryService_1.name, correlationId);
                    return {
                        success: true,
                        productId: productId,
                        previousStock: previousStock,
                        newStock: newStock,
                        requestedQuantity: quantity,
                    };
                });
            });
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = InventoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.DataSource])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map