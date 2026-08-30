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
const audit_1 = require("../common/audit");
let AdminService = AdminService_1 = class AdminService {
    constructor(orderRepository, lineItemRepository, syncJobRepository, ordersService, fulfillmentService, auditService) {
        this.orderRepository = orderRepository;
        this.lineItemRepository = lineItemRepository;
        this.syncJobRepository = syncJobRepository;
        this.ordersService = ordersService;
        this.fulfillmentService = fulfillmentService;
        this.auditService = auditService;
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
    async getStuckOrders(correlationId) {
        this.logger.log('Querying stuck orders', AdminService_1.name, correlationId);
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const stuckLineItems = await this.lineItemRepository
            .createQueryBuilder('li')
            .leftJoinAndSelect('li.syncJob', 'syncJob')
            .leftJoinAndSelect('li.product', 'product')
            .leftJoinAndSelect('li.order', 'order')
            .where('li.fulfillmentStatus IN (:...stuckStatuses)', {
            stuckStatuses: [
                order_line_item_entity_1.FulfillmentStatus.PENDING,
                order_line_item_entity_1.FulfillmentStatus.SYNCING,
                order_line_item_entity_1.FulfillmentStatus.AMBIGUOUS,
                order_line_item_entity_1.FulfillmentStatus.DEAD_LETTER,
            ],
        })
            .andWhere('(li.fulfillmentStatus = :pending AND li.createdAt < :tenMinutesAgo) OR ' +
            '(li.fulfillmentStatus = :syncing AND li.updatedAt < :fiveMinutesAgo) OR ' +
            'li.fulfillmentStatus IN (:terminalStatuses)', {
            pending: order_line_item_entity_1.FulfillmentStatus.PENDING,
            syncing: order_line_item_entity_1.FulfillmentStatus.SYNCING,
            tenMinutesAgo: tenMinutesAgo,
            fiveMinutesAgo: fiveMinutesAgo,
            terminalStatuses: [order_line_item_entity_1.FulfillmentStatus.AMBIGUOUS, order_line_item_entity_1.FulfillmentStatus.DEAD_LETTER],
        })
            .getMany();
        const orderMap = new Map();
        for (const item of stuckLineItems) {
            if (!orderMap.has(item.orderId)) {
                const stuckReason = this.determineStuckReason(item);
                orderMap.set(item.orderId, {
                    orderId: item.orderId,
                    buyerId: item.order.buyerId,
                    status: item.order.status,
                    createdAt: item.order.createdAt,
                    stuckReason: stuckReason,
                    stuckLineItems: [],
                });
            }
            const lineItemDto = {
                lineItemId: item.id,
                productId: item.productId,
                vendorId: item.vendorId,
                fulfillmentStatus: item.fulfillmentStatus,
                failureReason: item.failureReason || undefined,
                attempts: item.syncJob?.attempts || 0,
                lastAttemptedAt: item.syncJob?.lastAttemptedAt || undefined,
            };
            orderMap.get(item.orderId).stuckLineItems.push(lineItemDto);
        }
        const orders = Array.from(orderMap.values());
        return {
            total: orders.length,
            orders: orders,
        };
    }
    determineStuckReason(item) {
        switch (item.fulfillmentStatus) {
            case order_line_item_entity_1.FulfillmentStatus.PENDING:
                return 'Pending vendor contact for more than 10 minutes';
            case order_line_item_entity_1.FulfillmentStatus.SYNCING:
                return 'Vendor sync timed out (no response for 5+ minutes)';
            case order_line_item_entity_1.FulfillmentStatus.AMBIGUOUS:
                return 'Ambiguous vendor response - reconciliation inconclusive';
            case order_line_item_entity_1.FulfillmentStatus.DEAD_LETTER:
                return 'Vendor sync exhausted all retry attempts';
            default:
                return 'Unknown stuck condition';
        }
    }
    async resolveOrderLineItem(lineItemId, dto, correlationId) {
        this.logger.log('Admin resolving line item ' + lineItemId + ' to ' + dto.newFulfillmentStatus, AdminService_1.name, correlationId);
        const currentItem = await this.lineItemRepository.findOne({ where: { id: lineItemId } });
        if (!currentItem) {
            throw new common_1.NotFoundException('Line item ' + lineItemId + ' not found');
        }
        await this.fulfillmentService.manualResolve(lineItemId, { newStatus: dto.newFulfillmentStatus, reason: dto.reason, vendorReference: dto.vendorReference }, correlationId);
        await this.auditService.logAdminResolution(correlationId, lineItemId, currentItem.fulfillmentStatus, dto.newFulfillmentStatus, 'admin', dto.reason);
    }
    async cancelOrder(orderId, correlationId) {
        this.logger.log('Admin cancelling order ' + orderId, AdminService_1.name, correlationId);
        const currentOrder = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!currentOrder) {
            throw new common_1.NotFoundException('Order ' + orderId + ' not found');
        }
        await this.ordersService.cancelOrder(orderId, correlationId);
        await this.auditService.logAdminOrderCancel(correlationId, orderId, 'admin', currentOrder.status);
    }
    async getDeadLetterDetails(correlationId) {
        return this.fulfillmentService.getDeadLetterJobs();
    }
    async retryDeadLetterJob(jobId, correlationId) {
        var job = await this.syncJobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.NotFoundException('Job ' + jobId + ' not found');
        }
        await this.syncJobRepository.update(jobId, {
            status: vendor_sync_job_entity_1.SyncJobStatus.PENDING,
            attempts: 0,
            errorMessage: null,
        });
        await this.lineItemRepository.update(job.orderLineItemId, {
            fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.PENDING,
            failureReason: null,
        });
        this.logger.log('Dead letter job ' + jobId + ' reset for retry', AdminService_1.name, correlationId);
        await this.auditService.logAdminDeadLetterRetry(correlationId, jobId, 'admin');
    }
    async getAuditLogs(query, correlationId) {
        this.logger.log('Querying audit logs', AdminService_1.name, correlationId);
        return this.auditService.queryLogs(query);
    }
    async getTrace(correlationId) {
        return this.auditService.getTrace(correlationId);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_line_item_entity_1.OrderLineItem)),
    __param(2, (0, typeorm_1.InjectRepository)(vendor_sync_job_entity_1.VendorSyncJob)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        orders_service_1.OrdersService,
        fulfillment_service_1.FulfillmentService,
        audit_1.AuditService])
], AdminService);
//# sourceMappingURL=admin.service.js.map