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
var FulfillmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_line_item_entity_1 = require("../common/entities/order-line-item.entity");
const vendor_sync_job_entity_1 = require("../common/entities/vendor-sync-job.entity");
const order_entity_1 = require("../common/entities/order.entity");
const vendor_mock_service_1 = require("../integrations/vendor-mock/vendor-mock.service");
const vendor_mock_dto_1 = require("../integrations/vendor-mock/dto/vendor-mock.dto");
const audit_1 = require("../common/audit");
let FulfillmentService = FulfillmentService_1 = class FulfillmentService {
    constructor(lineItemRepository, syncJobRepository, orderRepository, vendorMockService, auditService) {
        this.lineItemRepository = lineItemRepository;
        this.syncJobRepository = syncJobRepository;
        this.orderRepository = orderRepository;
        this.vendorMockService = vendorMockService;
        this.auditService = auditService;
        this.logger = new common_1.Logger(FulfillmentService_1.name);
    }
    async createSyncJob(dto) {
        this.logger.log('Creating sync job for line item ' + dto.orderLineItemId, FulfillmentService_1.name, dto.correlationId);
        const syncJob = this.syncJobRepository.create({
            orderLineItemId: dto.orderLineItemId,
            status: vendor_sync_job_entity_1.SyncJobStatus.PENDING,
            maxAttempts: vendor_sync_job_entity_1.MAX_RETRY_ATTEMPTS,
            correlationId: dto.correlationId,
        });
        const saved = await this.syncJobRepository.save(syncJob);
        await this.auditService.logSyncJobCreated(dto.correlationId, saved.id, dto.orderLineItemId, dto.vendorId);
        return saved;
    }
    async processSyncJob(jobId, correlationId) {
        this.logger.log('Processing sync job ' + jobId, FulfillmentService_1.name, correlationId);
        const relations = { orderLineItem: true };
        const syncJob = await this.syncJobRepository.findOne({ where: { id: jobId }, relations: relations });
        if (!syncJob) {
            throw new common_1.NotFoundException('Sync job ' + jobId + ' not found');
        }
        if (syncJob.status === vendor_sync_job_entity_1.SyncJobStatus.COMPLETED) {
            return;
        }
        const previousStatus = syncJob.status;
        await this.syncJobRepository.update(jobId, {
            status: vendor_sync_job_entity_1.SyncJobStatus.IN_PROGRESS,
            attempts: syncJob.attempts + 1,
            lastAttemptedAt: new Date(),
        });
        await this.lineItemRepository.update(syncJob.orderLineItemId, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.SYNCING });
        await this.auditService.logSyncJobStatusChange(correlationId, jobId, previousStatus, vendor_sync_job_entity_1.SyncJobStatus.IN_PROGRESS, syncJob.attempts + 1);
        try {
            const lineItem = syncJob.orderLineItem;
            const request = {
                orderId: lineItem.orderId,
                lineItemId: lineItem.id,
                productId: lineItem.productId,
                vendorId: lineItem.vendorId,
                quantity: lineItem.quantity,
                correlationId: correlationId,
            };
            const response = await this.vendorMockService.requestFulfillment(request, correlationId);
            if (response.success) {
                await this.syncJobRepository.update(jobId, {
                    status: vendor_sync_job_entity_1.SyncJobStatus.COMPLETED,
                    completedAt: new Date(),
                    vendorResponse: JSON.stringify(response),
                });
                const previousFulfillmentStatus = lineItem.fulfillmentStatus;
                await this.lineItemRepository.update(syncJob.orderLineItemId, {
                    fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED,
                    vendorReference: response.vendorReference,
                });
                await this.auditService.logFulfillmentStatusChange(correlationId, lineItem.id, previousFulfillmentStatus, order_line_item_entity_1.FulfillmentStatus.CONFIRMED, lineItem.orderId, response.vendorReference);
                await this.auditService.logSyncJobStatusChange(correlationId, jobId, vendor_sync_job_entity_1.SyncJobStatus.IN_PROGRESS, vendor_sync_job_entity_1.SyncJobStatus.COMPLETED, syncJob.attempts + 1);
                await this.checkOrderFulfillment(lineItem.orderId, correlationId);
            }
            else {
                await this.handleSyncFailure(syncJob, response.message || 'Vendor API failed', correlationId);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.handleSyncFailure(syncJob, errorMessage, correlationId);
        }
    }
    async handleSyncFailure(syncJob, errorMessage, correlationId) {
        const newAttempts = syncJob.attempts + 1;
        const previousStatus = syncJob.status;
        if (newAttempts >= syncJob.maxAttempts) {
            await this.syncJobRepository.update(syncJob.id, {
                status: vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER,
                attempts: newAttempts,
                lastAttemptedAt: new Date(),
                errorMessage: errorMessage,
            });
            const previousFulfillmentStatus = syncJob.orderLineItem?.fulfillmentStatus || order_line_item_entity_1.FulfillmentStatus.PENDING;
            await this.lineItemRepository.update(syncJob.orderLineItemId, {
                fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.DEAD_LETTER,
                failureReason: 'Max retries exceeded: ' + errorMessage,
            });
            await this.auditService.logSyncJobDeadLetter(correlationId, syncJob.id, errorMessage, newAttempts);
            await this.auditService.logFulfillmentStatusChange(correlationId, syncJob.orderLineItemId, previousFulfillmentStatus, order_line_item_entity_1.FulfillmentStatus.DEAD_LETTER, syncJob.orderLineItem?.orderId);
        }
        else {
            await this.syncJobRepository.update(syncJob.id, {
                status: vendor_sync_job_entity_1.SyncJobStatus.PENDING,
                attempts: newAttempts,
                lastAttemptedAt: new Date(),
                errorMessage: errorMessage,
            });
            await this.auditService.logSyncJobStatusChange(correlationId, syncJob.id, previousStatus, vendor_sync_job_entity_1.SyncJobStatus.PENDING, newAttempts);
        }
    }
    async reconcile(olderThanMinutes = 10) {
        const reconciliationCorrelationId = 'reconciliation-' + Date.now();
        const result = { processed: 0, resolved: 0, stillAmbiguous: 0, errors: [] };
        const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
        const relations = { orderLineItem: true };
        const ambiguousJobs = await this.syncJobRepository.find({
            where: { status: vendor_sync_job_entity_1.SyncJobStatus.IN_PROGRESS, lastAttemptedAt: (0, typeorm_2.LessThan)(cutoffTime) },
            relations: relations,
        });
        for (const job of ambiguousJobs) {
            result.processed++;
            const correlationId = job.correlationId || reconciliationCorrelationId;
            try {
                const lineItem = job.orderLineItem;
                if (lineItem && lineItem.vendorReference) {
                    const statusResponse = await this.vendorMockService.queryFulfillmentStatus(lineItem.vendorId, lineItem.vendorReference, correlationId);
                    if (statusResponse.success) {
                        await this.syncJobRepository.update(job.id, { status: vendor_sync_job_entity_1.SyncJobStatus.COMPLETED, completedAt: new Date() });
                        await this.lineItemRepository.update(lineItem.id, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED });
                        await this.auditService.logReconciliationResolved(correlationId, job.id, 'Vendor confirmed fulfillment');
                        result.resolved++;
                    }
                    else if (statusResponse.responseType === vendor_mock_dto_1.VendorResponseType.FAILURE) {
                        await this.syncJobRepository.update(job.id, { status: vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER, errorMessage: statusResponse.message });
                        await this.lineItemRepository.update(lineItem.id, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.FAILED, failureReason: statusResponse.message });
                        result.resolved++;
                    }
                    else {
                        await this.syncJobRepository.update(job.id, { status: vendor_sync_job_entity_1.SyncJobStatus.AMBIGUOUS });
                        await this.lineItemRepository.update(lineItem.id, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.AMBIGUOUS });
                        result.stillAmbiguous++;
                    }
                }
                else {
                    await this.syncJobRepository.update(job.id, { status: vendor_sync_job_entity_1.SyncJobStatus.PENDING });
                    result.resolved++;
                }
            }
            catch (error) {
                result.errors.push('Job ' + job.id + ': ' + (error instanceof Error ? error.message : 'Unknown'));
            }
        }
        return result;
    }
    async manualResolve(lineItemId, dto, correlationId) {
        const relations = { syncJob: true };
        const lineItem = await this.lineItemRepository.findOne({ where: { id: lineItemId }, relations: relations });
        if (!lineItem) {
            throw new common_1.NotFoundException('Line item ' + lineItemId + ' not found');
        }
        const validFromStatuses = [order_line_item_entity_1.FulfillmentStatus.PENDING, order_line_item_entity_1.FulfillmentStatus.SYNCING, order_line_item_entity_1.FulfillmentStatus.AMBIGUOUS];
        if (!validFromStatuses.includes(lineItem.fulfillmentStatus)) {
            throw new Error('Invalid state transition: Cannot resolve from ' + lineItem.fulfillmentStatus);
        }
        const previousStatus = lineItem.fulfillmentStatus;
        const updateData = { fulfillmentStatus: dto.newStatus };
        if (dto.vendorReference) {
            updateData.vendorReference = dto.vendorReference;
        }
        if (dto.reason) {
            updateData.failureReason = dto.reason;
        }
        await this.lineItemRepository.update(lineItemId, updateData);
        if (lineItem.syncJob) {
            const newJobStatus = dto.newStatus === order_line_item_entity_1.FulfillmentStatus.CONFIRMED ? vendor_sync_job_entity_1.SyncJobStatus.COMPLETED : vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER;
            await this.syncJobRepository.update(lineItem.syncJob.id, {
                status: newJobStatus,
                errorMessage: dto.reason || null,
                completedAt: new Date(),
            });
        }
        await this.auditService.logFulfillmentStatusChange(correlationId, lineItemId, previousStatus, dto.newStatus, lineItem.orderId, dto.vendorReference);
        await this.checkOrderFulfillment(lineItem.orderId, correlationId);
    }
    async checkOrderFulfillment(orderId, correlationId) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: { lineItems: true },
        });
        if (!order || order.status === order_entity_1.OrderStatus.CANCELLED)
            return;
        const lineItems = order.lineItems;
        const anySyncing = lineItems.some((item) => item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.SYNCING || item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.PENDING);
        const anyConfirmed = lineItems.some((item) => item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.CONFIRMED);
        const anyFailed = lineItems.some((item) => item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.FAILED);
        const allFinished = lineItems.every((item) => item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.CONFIRMED || item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.FAILED);
        let newStatus = order.status;
        if (order.status === order_entity_1.OrderStatus.PLACED || order.status === order_entity_1.OrderStatus.CONFIRMED) {
            if (anySyncing || anyConfirmed || anyFailed) {
                newStatus = order_entity_1.OrderStatus.FULFILLING;
            }
        }
        if (allFinished) {
            if (anyConfirmed && !anyFailed) {
                newStatus = order_entity_1.OrderStatus.FULFILLED;
            }
            else if (anyFailed) {
                newStatus = anyConfirmed ? order_entity_1.OrderStatus.FULFILLED : order_entity_1.OrderStatus.CANCELLED;
            }
        }
        if (newStatus !== order.status) {
            await this.orderRepository.update(orderId, { status: newStatus });
            await this.auditService.logOrderStatusChange(correlationId, orderId, order.status, newStatus);
        }
    }
    async getDeadLetterJobs() {
        return this.syncJobRepository.find({
            where: { status: vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER },
            relations: { orderLineItem: true },
            order: { createdAt: 'DESC' },
        });
    }
    async getAmbiguousJobs() {
        return this.syncJobRepository.find({
            where: { status: vendor_sync_job_entity_1.SyncJobStatus.AMBIGUOUS },
            relations: { orderLineItem: true },
            order: { createdAt: 'DESC' },
        });
    }
};
exports.FulfillmentService = FulfillmentService;
exports.FulfillmentService = FulfillmentService = FulfillmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_line_item_entity_1.OrderLineItem)),
    __param(1, (0, typeorm_1.InjectRepository)(vendor_sync_job_entity_1.VendorSyncJob)),
    __param(2, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        vendor_mock_service_1.VendorMockService,
        audit_1.AuditService])
], FulfillmentService);
//# sourceMappingURL=fulfillment.service.js.map