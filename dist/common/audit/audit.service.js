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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("./audit-log.entity");
let AuditService = AuditService_1 = class AuditService {
    constructor(auditRepository) {
        this.auditRepository = auditRepository;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    async log(entry) {
        const auditLog = this.auditRepository.create({
            correlationId: entry.correlationId,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            previousState: entry.previousState || null,
            newState: entry.newState || null,
            userId: entry.userId || null,
            message: entry.message || null,
            metadata: entry.metadata || null,
        });
        const saved = await this.auditRepository.save(auditLog);
        this.logger.log('AUDIT: [' + entry.action + '] ' + entry.entityType + ':' + entry.entityId + ' | correlationId=' + entry.correlationId + (entry.message ? ' | ' + entry.message : ''), AuditService_1.name);
        return saved;
    }
    async logInventoryDecrement(correlationId, productId, previousStock, newStock, quantity, orderId) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.INVENTORY_DECREMENT,
            entityType: audit_log_entity_1.AuditEntityType.PRODUCT,
            entityId: productId,
            previousState: { stockCount: previousStock },
            newState: { stockCount: newStock },
            message: 'Stock decremented by ' + quantity + ' (order: ' + (orderId || 'N/A') + ')',
            metadata: { quantity, orderId },
        });
    }
    async logInventoryRestore(correlationId, productId, previousStock, newStock, quantity, reason) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.INVENTORY_RESTORE,
            entityType: audit_log_entity_1.AuditEntityType.PRODUCT,
            entityId: productId,
            previousState: { stockCount: previousStock },
            newState: { stockCount: newStock },
            message: 'Stock restored by ' + quantity + ' | reason: ' + reason,
            metadata: { quantity, reason },
        });
    }
    async logOrderCreated(correlationId, orderId, buyerId, totalAmount) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.ORDER_CREATED,
            entityType: audit_log_entity_1.AuditEntityType.ORDER,
            entityId: orderId,
            newState: { buyerId, totalAmount, status: 'placed' },
            message: 'Order created for buyer: ' + buyerId + ' | amount: ' + totalAmount,
            metadata: { buyerId, totalAmount },
        });
    }
    async logOrderStatusChange(correlationId, orderId, previousStatus, newStatus, userId) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.ORDER_STATUS_CHANGED,
            entityType: audit_log_entity_1.AuditEntityType.ORDER,
            entityId: orderId,
            previousState: { status: previousStatus },
            newState: { status: newStatus },
            userId: userId || null,
            message: 'Order status changed: ' + previousStatus + ' -> ' + newStatus,
            metadata: { previousStatus, newStatus },
        });
    }
    async logFulfillmentStatusChange(correlationId, lineItemId, previousStatus, newStatus, orderId, vendorReference) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.FULFILLMENT_STATUS_CHANGED,
            entityType: audit_log_entity_1.AuditEntityType.ORDER_LINE_ITEM,
            entityId: lineItemId,
            previousState: { fulfillmentStatus: previousStatus },
            newState: { fulfillmentStatus: newStatus, vendorReference: vendorReference || null },
            message: 'Fulfillment status changed: ' + previousStatus + ' -> ' + newStatus,
            metadata: { orderId, vendorReference },
        });
    }
    async logSyncJobCreated(correlationId, syncJobId, lineItemId, vendorId) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.SYNC_JOB_CREATED,
            entityType: audit_log_entity_1.AuditEntityType.VENDOR_SYNC_JOB,
            entityId: syncJobId,
            newState: { lineItemId, vendorId, status: 'pending' },
            message: 'Vendor sync job created for vendor: ' + vendorId,
            metadata: { lineItemId, vendorId },
        });
    }
    async logSyncJobStatusChange(correlationId, syncJobId, previousStatus, newStatus, attempts) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.SYNC_JOB_STATUS_CHANGED,
            entityType: audit_log_entity_1.AuditEntityType.VENDOR_SYNC_JOB,
            entityId: syncJobId,
            previousState: { status: previousStatus },
            newState: { status: newStatus, attempts: attempts || 0 },
            message: 'Sync job status changed: ' + previousStatus + ' -> ' + newStatus,
            metadata: { attempts },
        });
    }
    async logSyncJobDeadLetter(correlationId, syncJobId, errorMessage, attempts) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.SYNC_JOB_DEAD_LETTER,
            entityType: audit_log_entity_1.AuditEntityType.VENDOR_SYNC_JOB,
            entityId: syncJobId,
            previousState: { status: 'pending' },
            newState: { status: 'dead_letter', attempts },
            message: 'Sync job moved to dead letter after ' + attempts + ' attempts',
            metadata: { errorMessage, attempts },
        });
    }
    async logAdminResolution(correlationId, lineItemId, previousStatus, newStatus, adminUserId, reason) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.ADMIN_RESOLUTION,
            entityType: audit_log_entity_1.AuditEntityType.ORDER_LINE_ITEM,
            entityId: lineItemId,
            previousState: { fulfillmentStatus: previousStatus },
            newState: { fulfillmentStatus: newStatus },
            userId: adminUserId,
            message: 'Admin manual resolution: ' + previousStatus + ' -> ' + newStatus + (reason ? ' | reason: ' + reason : ''),
            metadata: { adminUserId, reason },
        });
    }
    async logAdminOrderCancel(correlationId, orderId, adminUserId, previousStatus) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.ADMIN_ORDER_CANCEL,
            entityType: audit_log_entity_1.AuditEntityType.ORDER,
            entityId: orderId,
            previousState: { status: previousStatus },
            newState: { status: 'cancelled' },
            userId: adminUserId,
            message: 'Admin cancelled order: ' + previousStatus + ' -> cancelled',
            metadata: { adminUserId },
        });
    }
    async logAdminDeadLetterRetry(correlationId, syncJobId, adminUserId) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.ADMIN_DEAD_LETTER_RETRY,
            entityType: audit_log_entity_1.AuditEntityType.VENDOR_SYNC_JOB,
            entityId: syncJobId,
            previousState: { status: 'dead_letter' },
            newState: { status: 'pending' },
            userId: adminUserId,
            message: 'Admin retried dead letter job',
            metadata: { adminUserId },
        });
    }
    async logReconciliationResolved(correlationId, syncJobId, resolution) {
        await this.log({
            correlationId,
            action: audit_log_entity_1.AuditAction.RECONCILIATION_RESOLVED,
            entityType: audit_log_entity_1.AuditEntityType.VENDOR_SYNC_JOB,
            entityId: syncJobId,
            previousState: { status: 'in_progress' },
            newState: { status: 'completed' },
            message: 'Reconciliation resolved: ' + resolution,
            metadata: { resolution },
        });
    }
    async queryLogs(query) {
        const queryBuilder = this.auditRepository.createQueryBuilder('audit');
        if (query.correlationId) {
            queryBuilder.andWhere('audit.correlationId = :correlationId', { correlationId: query.correlationId });
        }
        if (query.entityType) {
            queryBuilder.andWhere('audit.entityType = :entityType', { entityType: query.entityType });
        }
        if (query.entityId) {
            queryBuilder.andWhere('audit.entityId = :entityId', { entityId: query.entityId });
        }
        if (query.action) {
            queryBuilder.andWhere('audit.action = :action', { action: query.action });
        }
        if (query.fromDate) {
            queryBuilder.andWhere('audit.createdAt >= :fromDate', { fromDate: query.fromDate });
        }
        if (query.toDate) {
            queryBuilder.andWhere('audit.createdAt <= :toDate', { toDate: query.toDate });
        }
        const total = await queryBuilder.getCount();
        queryBuilder
            .orderBy('audit.createdAt', 'DESC')
            .limit(query.limit || 100)
            .offset(query.offset || 0);
        const logs = await queryBuilder.getMany();
        return { logs, total };
    }
    async getTrace(correlationId) {
        return this.auditRepository.find({
            where: { correlationId },
            order: { createdAt: 'ASC' },
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditService);
//# sourceMappingURL=audit.service.js.map