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
var CatalogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("../common/entities/product.entity");
const vendor_entity_1 = require("../common/entities/vendor.entity");
let CatalogService = CatalogService_1 = class CatalogService {
    constructor(productRepository, vendorRepository) {
        this.productRepository = productRepository;
        this.vendorRepository = vendorRepository;
        this.logger = new common_1.Logger(CatalogService_1.name);
    }
    async createProduct(dto, correlationId) {
        this.logger.log('Creating product: ' + dto.name, CatalogService_1.name, correlationId);
        const vendor = await this.vendorRepository.findOne({ where: { id: dto.vendorId } });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor with ID ' + dto.vendorId + ' not found');
        }
        const product = this.productRepository.create({
            vendorId: dto.vendorId,
            name: dto.name,
            price: dto.price,
            stockCount: dto.stockCount,
            isActive: true,
        });
        const saved = await this.productRepository.save(product);
        this.logger.log('Product created: ' + saved.id, CatalogService_1.name, correlationId);
        return this.toResponseDto(saved, vendor.name);
    }
    async findAll(activeOnly = true) {
        const whereClause = activeOnly ? { isActive: true } : {};
        const products = await this.productRepository.find({
            where: whereClause,
            relations: ['vendor'],
            order: { createdAt: 'DESC' },
        });
        return products.map(function (p) { return this.toResponseDto(p, p.vendor ? p.vendor.name : 'Unknown'); }.bind(this));
    }
    async findById(id) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });
        if (!product) {
            throw new common_1.NotFoundException('Product with ID ' + id + ' not found');
        }
        return this.toResponseDto(product, product.vendor ? product.vendor.name : 'Unknown');
    }
    async findByVendor(vendorId, activeOnly = true) {
        const where = { vendorId: vendorId };
        if (activeOnly) {
            where['isActive'] = true;
        }
        const products = await this.productRepository.find({
            where: where,
            relations: ['vendor'],
            order: { createdAt: 'DESC' },
        });
        return products.map(function (p) { return this.toResponseDto(p, p.vendor ? p.vendor.name : 'Unknown'); }.bind(this));
    }
    async updateProduct(id, dto, correlationId) {
        this.logger.log('Updating product: ' + id, CatalogService_1.name, correlationId);
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['vendor'],
        });
        if (!product) {
            throw new common_1.NotFoundException('Product with ID ' + id + ' not found');
        }
        if (dto.name) {
            product.name = dto.name;
        }
        if (dto.price !== undefined) {
            product.price = dto.price;
        }
        if (dto.stockCount !== undefined) {
            product.stockCount = dto.stockCount;
        }
        if (dto.isActive !== undefined) {
            product.isActive = dto.isActive;
        }
        const saved = await this.productRepository.save(product);
        this.logger.log('Product updated: ' + id, CatalogService_1.name, correlationId);
        return this.toResponseDto(saved, saved.vendor ? saved.vendor.name : 'Unknown');
    }
    toResponseDto(product, vendorName) {
        return {
            id: product.id,
            vendorId: product.vendorId,
            vendorName: vendorName,
            name: product.name,
            price: Number(product.price),
            stockCount: product.stockCount,
            isActive: product.isActive,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
        };
    }
};
exports.CatalogService = CatalogService;
exports.CatalogService = CatalogService = CatalogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(vendor_entity_1.Vendor)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository])
], CatalogService);
//# sourceMappingURL=catalog.service.js.map