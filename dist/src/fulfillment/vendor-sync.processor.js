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
        this.logger.log('Processing vendor sync job ' + data.jobId, VendorSyncProcessor_1.name, data.correlationId);
        try {
            await this.fulfillmentService.processSyncJob(data.jobId, data.correlationId);
            this.logger.log('Vendor sync job ' + data.jobId + ' completed', VendorSyncProcessor_1.name, data.correlationId);
        }
        catch (error) {
            var errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Vendor sync job ' + data.jobId + ' failed: ' + errorMessage, error instanceof Error ? error.stack : undefined, VendorSyncProcessor_1.name, data.correlationId);
            throw error;
        }
    }
    onFailed(job, error) {
        this.logger.error('Job ' + job.id + ' failed: ' + error.message, error.stack, VendorSyncProcessor_1.name, job.data.correlationId);
    }
};
exports.VendorSyncProcessor = VendorSyncProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], VendorSyncProcessor.prototype, "onFailed", null);
exports.VendorSyncProcessor = VendorSyncProcessor = VendorSyncProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(exports.VENDOR_SYNC_QUEUE),
    __metadata("design:paramtypes", [fulfillment_service_1.FulfillmentService])
], VendorSyncProcessor);
//# sourceMappingURL=vendor-sync.processor.js.map