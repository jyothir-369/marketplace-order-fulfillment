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
var VendorSyncIsolatedProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorSyncIsolatedProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_2 = require("bullmq");
const fulfillment_service_1 = require("./fulfillment.service");
const vendor_queue_service_1 = require("./vendor-queue.service");
let VendorSyncIsolatedProcessor = VendorSyncIsolatedProcessor_1 = class VendorSyncIsolatedProcessor extends bullmq_1.WorkerHost {
    constructor(fulfillmentService, vendorQueueService) {
        super();
        this.fulfillmentService = fulfillmentService;
        this.vendorQueueService = vendorQueueService;
        this.logger = new common_1.Logger(VendorSyncIsolatedProcessor_1.name);
        this.vendorWorker = null;
        this.isInitialized = false;
    }
    async onModuleInit() {
        if (this.isInitialized) {
            return;
        }
        this.logger.log('Initializing VendorSyncIsolatedProcessor worker');
        this.vendorWorker = new bullmq_2.Worker('vendor-sync-isolated', async (job) => {
            return this.processJob(job);
        }, {
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            concurrency: 5,
        });
        this.vendorWorker.on('completed', (job) => {
            this.logger.log('Vendor sync job completed: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')', VendorSyncIsolatedProcessor_1.name, job.data.correlationId);
        });
        this.vendorWorker.on('failed', (job, err) => {
            this.logger.error('Vendor sync job failed: ' + (job?.data?.jobId || 'unknown') + ' - ' + err.message, err.stack, VendorSyncIsolatedProcessor_1.name, job?.data?.correlationId);
        });
        this.isInitialized = true;
        this.logger.log('VendorSyncIsolatedProcessor worker initialized');
    }
    async onModuleDestroy() {
        if (this.vendorWorker) {
            await this.vendorWorker.close();
            this.logger.log('VendorSyncIsolatedProcessor worker closed');
        }
    }
    async processJob(job) {
        const { jobId, vendorId, correlationId } = job.data;
        const effectiveCorrelationId = correlationId || 'vendor-sync-isolated-' + jobId;
        this.logger.log('Processing vendor sync job: ' + jobId + ' for vendor: ' + vendorId, VendorSyncIsolatedProcessor_1.name, effectiveCorrelationId);
        try {
            await this.fulfillmentService.processSyncJob(jobId, effectiveCorrelationId);
            this.logger.log('Vendor sync job completed successfully: ' + jobId + ' (vendor: ' + vendorId + ')', VendorSyncIsolatedProcessor_1.name, effectiveCorrelationId);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Vendor sync job failed: ' + jobId + ' (vendor: ' + vendorId + ') - ' + errorMessage, error instanceof Error ? error.stack : undefined, VendorSyncIsolatedProcessor_1.name, effectiveCorrelationId);
            throw error;
        }
    }
    async process(job) {
        return this.processJob(job);
    }
    onActive(job) {
        this.logger.log('Processing vendor sync job: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')', VendorSyncIsolatedProcessor_1.name, job.data.correlationId);
    }
    onCompleted(job) {
        this.logger.log('Vendor sync job completed: ' + job.data.jobId + ' (vendor: ' + job.data.vendorId + ')', VendorSyncIsolatedProcessor_1.name, job.data.correlationId);
    }
    onFailed(job, error) {
        this.logger.error('Vendor sync job failed: ' + (job?.data?.jobId || 'unknown') + ' - ' + error.message, error.stack, VendorSyncIsolatedProcessor_1.name, job?.data?.correlationId);
    }
    onStalled(jobId) {
        this.logger.warn('Job stalled: ' + jobId, VendorSyncIsolatedProcessor_1.name);
    }
};
exports.VendorSyncIsolatedProcessor = VendorSyncIsolatedProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], VendorSyncIsolatedProcessor.prototype, "onActive", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('completed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job]),
    __metadata("design:returntype", void 0)
], VendorSyncIsolatedProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bullmq_2.Job, Error]),
    __metadata("design:returntype", void 0)
], VendorSyncIsolatedProcessor.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('stalled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VendorSyncIsolatedProcessor.prototype, "onStalled", null);
exports.VendorSyncIsolatedProcessor = VendorSyncIsolatedProcessor = VendorSyncIsolatedProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('vendor-sync-isolated'),
    __metadata("design:paramtypes", [fulfillment_service_1.FulfillmentService,
        vendor_queue_service_1.VendorQueueService])
], VendorSyncIsolatedProcessor);
//# sourceMappingURL=vendor-sync-isolated.processor.js.map