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
var VendorSyncProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorSyncProcessor = exports.VENDOR_SYNC_QUEUE = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const fulfillment_service_1 = require("./fulfillment.service");
exports.VENDOR_SYNC_QUEUE = 'vendor-sync';
let VendorSyncProcessor = VendorSyncProcessor_1 = class VendorSyncProcessor extends bullmq_1.WorkerHost {
    constructor(fulfillmentService) {
        super();
        this.fulfillmentService = fulfillmentService;
        this.logger = new common_1.Logger(VendorSyncProcessor_1.name);
    }
    async process(job) {
        var data = job.data;
        const correlationId = data.correlationId || 'vendor-sync-' + data.jobId;
        this.logger.log('Processing vendor sync job: ' + data.jobId + ' (vendor: ' + data.vendorId + ')', VendorSyncProcessor_1.name, correlationId);
        try {
            await this.fulfillmentService.processSyncJob(data.jobId, correlationId);
            this.logger.log('Vendor sync job completed: ' + data.jobId + ' (vendor: ' + data.vendorId + ')', VendorSyncProcessor_1.name, correlationId);
        }
        catch (error) {
            var errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Vendor sync job failed: ' + data.jobId + ' (vendor: ' + data.vendorId + ') - ' + errorMessage, error instanceof Error ? error.stack : undefined, VendorSyncProcessor_1.name, correlationId);
            throw error;
        }
    }
    onActive(job) {
        this.logger.log('Vendor sync job active: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')', VendorSyncProcessor_1.name, job.data.correlationId);
    }
    onCompleted(job) {
        this.logger.log('Vendor sync job completed successfully: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')', VendorSyncProcessor_1.name, job.data.correlationId);
    }
    onFailed(job, error) {
        this.logger.error('Vendor sync job failed permanently: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ') - ' + error.message, error.stack, VendorSyncProcessor_1.name, job.data.correlationId);
    }
    onStalled(jobId) {
        this.logger.warn('Vendor sync job stalled: ' + jobId, VendorSyncProcessor_1.name);
    }
};
exports.VendorSyncProcessor = VendorSyncProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], VendorSyncProcessor.prototype, "onActive", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], VendorSyncProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], VendorSyncProcessor.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('stalled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VendorSyncProcessor.prototype, "onStalled", null);
exports.VendorSyncProcessor = VendorSyncProcessor = VendorSyncProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(exports.VENDOR_SYNC_QUEUE),
    __metadata("design:paramtypes", [fulfillment_service_1.FulfillmentService])
], VendorSyncProcessor);
//# sourceMappingURL=vendor-sync.processor.js.map