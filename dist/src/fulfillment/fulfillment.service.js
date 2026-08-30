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
let FulfillmentService = FulfillmentService_1 = class FulfillmentService {
    constructor(lineItemRepository, syncJobRepository, orderRepository, vendorMockService) {
        this.lineItemRepository = lineItemRepository;
        this.syncJobRepository = syncJobRepository;
        this.orderRepository = orderRepository;
        this.vendorMockService = vendorMockService;
        this.logger = new common_1.Logger(FulfillmentService_1.name);
    }
    async createSyncJob(dto) {
        this.logger.log('Creating sync job for line item ' + dto.orderLineItemId, FulfillmentService_1.name, dto.correlationId);
        var syncJob = this.syncJobRepository.create({
            orderLineItemId: dto.orderLineItemId,
            status: vendor_sync_job_entity_1.SyncJobStatus.PENDING,
            maxAttempts: vendor_sync_job_entity_1.MAX_RETRY_ATTEMPTS,
            correlationId: dto.correlationId,
        });
        return this.syncJobRepository.save(syncJob);
    }
    async processSyncJob(jobId, correlationId) {
        this.logger.log('Processing sync job ' + jobId, FulfillmentService_1.name, correlationId);
        var syncJob = await this.syncJobRepository.findOne({ where: { id: jobId }, relations: ['orderLineItem'] });
        if (!syncJob) {
            throw new common_1.NotFoundException('Sync job ' + jobId + ' not found');
        }
        if (syncJob.status === vendor_sync_job_entity_1.SyncJobStatus.COMPLETED) {
            return;
        }
        await this.syncJobRepository.update(jobId, { status: vendor_sync_job_entity_1.SyncJobStatus.IN_PROGRESS, attempts: syncJob.attempts + 1, lastAttemptedAt: new Date() });
        await this.lineItemRepository.update(syncJob.orderLineItemId, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.SYNCING });
        try {
            var lineItem = syncJob.orderLineItem;
            var request = { orderId: lineItem.orderId, lineItemId: lineItem.id, productId: lineItem.productId, vendorId: lineItem.vendorId, quantity: lineItem.quantity, correlationId: correlationId };
            var response = await this.vendorMockService.requestFulfillment(request, correlationId);
            if (response.success) {
                await this.syncJobRepository.update(jobId, { status: vendor_sync_job_entity_1.SyncJobStatus.COMPLETED, completedAt: new Date(), vendorResponse: JSON.stringify(response) });
                await this.lineItemRepository.update(syncJob.orderLineItemId, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED, vendorReference: response.vendorReference });
                await this.checkOrderFulfillment(lineItem.orderId, correlationId);
            }
            else {
                await this.handleSyncFailure(syncJob, response.message || 'Vendor API failed', correlationId);
            }
        }
        catch (error) {
            var errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.handleSyncFailure(syncJob, errorMessage, correlationId);
        }
    }
    async handleSyncFailure(syncJob, errorMessage, correlationId) {
        var newAttempts = syncJob.attempts + 1;
        if (newAttempts >= syncJob.maxAttempts) {
            await this.syncJobRepository.update(syncJob.id, { status: vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER, attempts: newAttempts, lastAttemptedAt: new Date(), errorMessage: errorMessage });
            await this.lineItemRepository.update(syncJob.orderLineItemId, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.DEAD_LETTER, failureReason: 'Max retries exceeded: ' + errorMessage });
        }
        else {
            await this.syncJobRepository.update(syncJob.id, { status: vendor_sync_job_entity_1.SyncJobStatus.PENDING, attempts: newAttempts, lastAttemptedAt: new Date(), errorMessage: errorMessage });
            await this.lineItemRepository.update(syncJob.orderLineItemId, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.PENDING });
        }
    }
    async reconcile(olderThanMinutes = 10) {
        var result = { processed: 0, resolved: 0, stillAmbiguous: 0, errors: [] };
        var cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
        var ambiguousJobs = await this.syncJobRepository.find({
            where: { status: vendor_sync_job_entity_1.SyncJobStatus.IN_PROGRESS, lastAttemptedAt: (0, typeorm_2.LessThan)(cutoffTime) },
            relations: ['orderLineItem'],
        });
        for (var i = 0; i < ambiguousJobs.length; i++) {
            var job = ambiguousJobs[i];
            result.processed++;
            var correlationId = job.correlationId || 'reconciliation';
            try {
                var lineItem = job.orderLineItem;
                if (lineItem && lineItem.vendorReference) {
                    var statusResponse = await this.vendorMockService.queryFulfillmentStatus(lineItem.vendorId, lineItem.vendorReference, correlationId);
                    if (statusResponse.success) {
                        await this.syncJobRepository.update(job.id, { status: vendor_sync_job_entity_1.SyncJobStatus.COMPLETED, completedAt: new Date() });
                        await this.lineItemRepository.update(lineItem.id, { fulfillmentStatus: order_line_item_entity_1.FulfillmentStatus.CONFIRMED });
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
        var lineItem = await this.lineItemRepository.findOne({ where: { id: lineItemId }, relations: ['syncJob'] });
        if (!lineItem) {
            throw new common_1.NotFoundException('Line item ' + lineItemId + ' not found');
        }
        var updateData = { fulfillmentStatus: dto.newStatus };
        if (dto.vendorReference) {
            updateData['vendorReference'] = dto.vendorReference;
        }
        if (dto.reason) {
            updateData['failureReason'] = dto.reason;
        }
        await this.lineItemRepository.update(lineItemId, updateData);
        if (lineItem.syncJob) {
            await this.syncJobRepository.update(lineItem.syncJob.id, { status: dto.newStatus === order_line_item_entity_1.FulfillmentStatus.CONFIRMED ? vendor_sync_job_entity_1.SyncJobStatus.COMPLETED : vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER });
        }
        await this.checkOrderFulfillment(lineItem.orderId, correlationId);
    }
    async checkOrderFulfillment(orderId, correlationId) {
        var lineItems = await this.lineItemRepository.find({ where: { orderId: orderId } });
        var allConfirmed = lineItems.every(function (item) { return item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.CONFIRMED || item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.FAILED; });
        var anyDeadLetter = lineItems.some(function (item) { return item.fulfillmentStatus === order_line_item_entity_1.FulfillmentStatus.DEAD_LETTER; });
        if (allConfirmed) {
            var newStatus = anyDeadLetter ? order_entity_1.OrderStatus.FULFILLING : order_entity_1.OrderStatus.FULFILLED;
            await this.orderRepository.update(orderId, { status: newStatus });
        }
    }
    async getDeadLetterJobs() {
        return this.syncJobRepository.find({ where: { status: vendor_sync_job_entity_1.SyncJobStatus.DEAD_LETTER }, relations: ['orderLineItem'], order: { createdAt: 'DESC' } });
    }
    async getAmbiguousJobs() {
        return this.syncJobRepository.find({ where: { status: vendor_sync_job_entity_1.SyncJobStatus.AMBIGUOUS }, relations: ['orderLineItem'], order: { createdAt: 'DESC' } });
    }
};
exports.FulfillmentService = FulfillmentService;
exports.FulfillmentService = FulfillmentService = FulfillmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_line_item_entity_1.OrderLineItem)),
    __param(1, (0, typeorm_1.InjectRepository)(vendor_sync_job_entity_1.VendorSyncJob)),
    __param(2, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeorm_2.Repository, typeorm_2.Repository, vendor_mock_service_1.VendorMockService])
], FulfillmentService);
//# sourceMappingURL=fulfillment.service.js.map