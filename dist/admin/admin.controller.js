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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const admin_dto_1 = require("./dto/admin.dto");
const correlation_id_decorator_1 = require("../common/decorators/correlation-id.decorator");
const audit_1 = require("../common/audit");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getDashboard(correlationId) {
        return this.adminService.getDashboard(correlationId);
    }
    async getOrders(filter, correlationId) {
        return this.adminService.getOrders(filter, correlationId);
    }
    async cancelOrder(orderId, correlationId) {
        await this.adminService.cancelOrder(orderId, correlationId);
        return { message: 'Order cancelled' };
    }
    async resolveLineItem(lineItemId, dto, correlationId) {
        await this.adminService.resolveOrderLineItem(lineItemId, dto, correlationId);
        return { message: 'Line item resolved' };
    }
    async getDeadLetterJobs(correlationId) {
        return this.adminService.getDeadLetterDetails(correlationId);
    }
    async retryDeadLetterJob(jobId, correlationId) {
        await this.adminService.retryDeadLetterJob(jobId, correlationId);
        return { message: 'Job queued for retry' };
    }
    async getAuditLogs(correlationId, entityType, entityId, action, limit, offset, parentCorrelationId) {
        const queryCorrelationId = correlationId || parentCorrelationId || 'admin-query';
        const result = await this.adminService.getAuditLogs({
            correlationId: queryCorrelationId,
            entityType: entityType,
            entityId,
            action: action,
            limit: limit || 100,
            offset: offset || 0,
        }, queryCorrelationId);
        return {
            total: result.total,
            logs: result.logs.map((log) => ({
                id: log.id,
                correlationId: log.correlationId,
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                message: log.message || '',
                userId: log.userId || undefined,
                metadata: log.metadata || undefined,
                createdAt: log.createdAt,
            })),
        };
    }
    async getTrace(correlationId) {
        const logs = await this.adminService.getTrace(correlationId);
        return {
            total: logs.length,
            logs: logs.map((log) => ({
                id: log.id,
                correlationId: log.correlationId,
                action: log.action,
                entityType: log.entityType,
                entityId: log.entityId,
                message: log.message || '',
                userId: log.userId || undefined,
                metadata: log.metadata || undefined,
                createdAt: log.createdAt,
            })),
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('orders'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_dto_1.AdminOrderFilterDto, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Post)('orders/:orderId/cancel'),
    __param(0, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(1, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "cancelOrder", null);
__decorate([
    (0, common_1.Post)('line-items/:lineItemId/resolve'),
    __param(0, (0, common_1.Param)('lineItemId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_dto_1.AdminResolveDto, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resolveLineItem", null);
__decorate([
    (0, common_1.Get)('dead-letter'),
    __param(0, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDeadLetterJobs", null);
__decorate([
    (0, common_1.Post)('dead-letter/:jobId/retry'),
    __param(0, (0, common_1.Param)('jobId', common_1.ParseUUIDPipe)),
    __param(1, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "retryDeadLetterJob", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    __param(0, (0, common_1.Query)('correlationId')),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __param(3, (0, common_1.Query)('action')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __param(6, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Number, Number, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('trace/:correlationId'),
    __param(0, (0, common_1.Param)('correlationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTrace", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map