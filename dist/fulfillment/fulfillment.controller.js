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
exports.FulfillmentController = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const fulfillment_service_1 = require("./fulfillment.service");
const vendor_sync_processor_1 = require("./vendor-sync.processor");
const vendor_queue_service_1 = require("./vendor-queue.service");
const correlation_id_decorator_1 = require("../common/decorators/correlation-id.decorator");
let FulfillmentController = class FulfillmentController {
    constructor(fulfillmentService, vendorQueueService, syncQueue) {
        this.fulfillmentService = fulfillmentService;
        this.vendorQueueService = vendorQueueService;
        this.syncQueue = syncQueue;
    }
    async enqueueSyncJob(orderLineItemId, body, correlationId) {
        var syncJob = await this.fulfillmentService.createSyncJob({
            orderLineItemId: orderLineItemId,
            orderId: body.orderId,
            vendorId: body.vendorId,
            correlationId: correlationId,
        });
        var jobData = {
            jobId: syncJob.id,
            orderLineItemId: orderLineItemId,
            vendorId: body.vendorId,
            correlationId: correlationId,
        };
        await this.vendorQueueService.addJobToVendorQueue(body.vendorId, jobData);
        var queueName = this.vendorQueueService.getQueueName(body.vendorId);
        return {
            message: 'Sync job enqueued to vendor-specific queue',
            jobId: syncJob.id,
            vendorId: body.vendorId,
            queueName: queueName,
        };
    }
    async enqueueSyncJobLegacy(orderLineItemId, body, correlationId) {
        var syncJob = await this.fulfillmentService.createSyncJob({
            orderLineItemId: orderLineItemId,
            orderId: body.orderId,
            vendorId: body.vendorId,
            correlationId: correlationId,
        });
        var jobData = {
            jobId: syncJob.id,
            orderLineItemId: orderLineItemId,
            vendorId: body.vendorId,
            correlationId: correlationId,
        };
        await this.syncQueue.add('vendor-sync', jobData, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 100,
            removeOnFail: 1000,
        });
        return {
            message: 'Sync job enqueued to legacy queue',
            jobId: syncJob.id,
            queueName: vendor_sync_processor_1.VENDOR_SYNC_QUEUE,
        };
    }
    async configureVendor(vendorId, body, correlationId) {
        await this.vendorQueueService.configureVendorConcurrency(vendorId, body.concurrency || 3);
        return {
            message: 'Vendor concurrency configured',
            vendorId: vendorId,
            concurrency: body.concurrency || 3,
            queueName: this.vendorQueueService.getQueueName(vendorId),
        };
    }
    async runReconciliation(body) {
        return this.fulfillmentService.reconcile(body.olderThanMinutes !== undefined ? body.olderThanMinutes : 10);
    }
    async getQueueStats(vendorId) {
        if (vendorId) {
            return this.vendorQueueService.getQueueStats(vendorId);
        }
        return this.vendorQueueService.getAllQueueStats();
    }
    async getDeadLetterJobs() {
        return this.fulfillmentService.getDeadLetterJobs();
    }
    async getAmbiguousJobs() {
        return this.fulfillmentService.getAmbiguousJobs();
    }
};
exports.FulfillmentController = FulfillmentController;
__decorate([
    (0, common_1.Post)('sync/:orderLineItemId'),
    __param(0, (0, common_1.Param)('orderLineItemId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "enqueueSyncJob", null);
__decorate([
    (0, common_1.Post)('sync/:orderLineItemId/legacy'),
    __param(0, (0, common_1.Param)('orderLineItemId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "enqueueSyncJobLegacy", null);
__decorate([
    (0, common_1.Post)('vendor/:vendorId/configure'),
    __param(0, (0, common_1.Param)('vendorId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, correlation_id_decorator_1.CorrelationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "configureVendor", null);
__decorate([
    (0, common_1.Post)('reconcile'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "runReconciliation", null);
__decorate([
    (0, common_1.Get)('queues/stats'),
    __param(0, (0, common_1.Query)('vendorId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "getQueueStats", null);
__decorate([
    (0, common_1.Get)('dead-letter'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "getDeadLetterJobs", null);
__decorate([
    (0, common_1.Get)('ambiguous'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "getAmbiguousJobs", null);
exports.FulfillmentController = FulfillmentController = __decorate([
    (0, common_1.Controller)('fulfillment'),
    __param(2, (0, bullmq_1.InjectQueue)(vendor_sync_processor_1.VENDOR_SYNC_QUEUE)),
    __metadata("design:paramtypes", [fulfillment_service_1.FulfillmentService,
        vendor_queue_service_1.VendorQueueService,
        bullmq_2.Queue])
], FulfillmentController);
//# sourceMappingURL=fulfillment.controller.js.map