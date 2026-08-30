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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../common/entities/order.entity");
const order_line_item_entity_1 = require("../common/entities/order-line-item.entity");
const vendor_sync_job_entity_1 = require("../common/entities/vendor-sync-job.entity");
const orders_service_1 = require("../orders/orders.service");
const fulfillment_service_1 = require("../fulfillment/fulfillment.service");
let AdminService = AdminService_1 = class AdminService {
    constructor(orderRepository, lineItemRepository, syncJobRepository, ordersService, fulfillmentService) {
        this.orderRepository = orderRepository;
        this.lineItemRepository = lineItemRepository;
        this.syncJobRepository = syncJobRepository;
        this.ordersService = ordersService;
        this.fulfillmentService = fulfillmentService;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    async getDashboard(correlationId) {
        var totalOrders = await this.orderRepository.count();
        var deadLetterJobs = await this.syncJobRepository.count({ where: { status: vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER } });
        var ambiguousJobs = await this.syncJobRepository.count({ where: { status: vendor_sync_job_entity_1.SyncJobStatus.AMBIGUOUS } });
        var statusCounts = await this.orderRepository
            .createQueryBuilder('order')
            .select('order.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('order.status')
            .getRawMany();
        var countsByStatus = new Map();
        for (var i = 0; i < statusCounts.length; i++) {
            var s = statusCounts[i];
            countsByStatus.set(s.status, parseInt(s.count, 10));
        }
        return {
            totalOrders: totalOrders,
            pendingOrders: countsByStatus.get(order_entity_1.OrderStatus.PLACED) || 0,
            fulfillingOrders: countsByStatus.get(order_entity_1.OrderStatus.FULFILLING) || 0,
            fulfilledOrders: countsByStatus.get(order_entity_1.OrderStatus.FULFILLED) || 0,
            cancelledOrders: countsByStatus.get(order_entity_1.OrderStatus.CANCELLED) || 0,
            deadLetterJobs: deadLetterJobs,
            ambiguousJobs: ambiguousJobs,
        };
    }
    async resolveOrderLineItem(lineItemId, dto, correlationId) {
        this.logger.log('Admin resolving line item ' + lineItemId + ' to ' + dto.newFulfillmentStatus, AdminService_1.name, correlationId);
        await this.fulfillmentService.manualResolve(lineItemId, { newStatus: dto.newFulfillmentStatus, reason: dto.reason, vendorReference: dto.vendorReference }, correlationId);
    }
    async cancelOrder(orderId, correlationId) {
        this.logger.log('Admin cancelling order ' + orderId, AdminService_1.name, correlationId);
        await this.ordersService.cancelOrder(orderId, correlationId);
    }
    async getDeadLetterDetails(correlationId) {
        return this.fulfillmentService.getDeadLetterJobs();
    }
    async retryDeadLetterJob(jobId, correlationId) {
        var job = await this.syncJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new Error('Job ' + jobId + ' not found');
        }
        await this.syncJobRepository.update(jobId, { status: vendor_sync_job_entity_1.SyncJobStatus.PENDING, attempts: 0, errorMessage: null });
        await this.lineItemRepository.update(job.orderLineItemId, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.PENDING, failureReason: null });
        this.logger.log('Dead letter job ' + jobId + ' reset for retry', AdminService_1.name, correlationId);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_line_item_entity_1.OrderLineItem)),
    __param(2, (0, typeorm_1.InjectRepository)(vendor_sync_job_entity_1.VendorSyncJob)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, orders_service_1.OrdersService, fulfillment_service_1.FulfillmentService])
], AdminService);
//# sourceMappingURL=admin.service.js.map