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
var VendorQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let VendorQueueService = VendorQueueService_1 = class VendorQueueService {
    constructor(baseQueue) {
        this.baseQueue = baseQueue;
        this.logger = new common_1.Logger(VendorQueueService_1.name);
        this.vendorQueues = new Map();
        this.vendorQueueEvents = new Map();
        this.defaultConcurrency = 3;
        this.maxConcurrencyPerVendor = 10;
    }
    async onModuleInit() {
        this.logger.log('VendorQueueService initialized');
    }
    async onModuleDestroy() {
        this.logger.log('Cleaning up vendor queues');
        for (const [vendorId, queue] of this.vendorQueues.entries()) {
            await queue.close();
            this.logger.log('Closed queue for vendor: ' + vendorId);
        }
        for (const [vendorId, events] of this.vendorQueueEvents.entries()) {
            await events.close();
        }
        this.vendorQueues.clear();
        this.vendorQueueEvents.clear();
    }
    getQueueName(vendorId) {
        return 'vendor-sync-' + vendorId;
    }
    getQueueEventsName(vendorId) {
        return 'vendor-sync-' + vendorId + '-events';
    }
    async getOrCreateVendorQueue(vendorId, concurrency) {
        if (this.vendorQueues.has(vendorId)) {
            return this.vendorQueues.get(vendorId);
        }
        const queueName = this.getQueueName(vendorId);
        const effectiveConcurrency = Math.min(concurrency || this.defaultConcurrency, this.maxConcurrencyPerVendor);
        this.logger.log('Creating queue for vendor: ' + vendorId + ' with concurrency: ' + effectiveConcurrency);
        const queue = new bullmq_2.Queue(queueName, {
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            defaultJobOptions: {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: 100,
                removeOnFail: 1000,
            },
        });
        const queueEvents = new bullmq_2.QueueEvents(queueName, {
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
        });
        this.vendorQueues.set(vendorId, queue);
        this.vendorQueueEvents.set(vendorId, queueEvents);
        this.logger.log('Vendor queue created: ' + queueName + ' (concurrency: ' + effectiveConcurrency + ')');
        return queue;
    }
    async addJobToVendorQueue(vendorId, data, options) {
        const queue = await this.getOrCreateVendorQueue(vendorId, options?.concurrency);
        const jobOptions = {
            attempts: options?.attempts || 5,
            backoff: {
                type: 'exponential',
                delay: options?.backoffDelay || 1000,
            },
            removeOnComplete: 100,
            removeOnFail: 1000,
        };
        await queue.add('vendor-sync', data, jobOptions);
        this.logger.log('Job added to vendor queue: ' + vendorId + ' for sync job: ' + data.jobId, VendorQueueService_1.name, data.correlationId);
    }
    async addJobToVendorQueueWithRetry(vendorId, data, retryCount) {
        const queue = await this.getOrCreateVendorQueue(vendorId);
        await queue.add('vendor-sync-retry-' + retryCount, data, {
            attempts: Math.max(5 - retryCount, 1),
            backoff: {
                type: 'exponential',
                delay: Math.min(1000 * Math.pow(2, retryCount), 60000),
            },
            removeOnComplete: 100,
            removeOnFail: 1000,
        });
        this.logger.log('Retry job added to vendor queue: ' + vendorId + ' for sync job: ' + data.jobId + ' (retry: ' + retryCount + ')', VendorQueueService_1.name, data.correlationId);
    }
    getVendorQueue(vendorId) {
        return this.vendorQueues.get(vendorId);
    }
    getAllVendorQueues() {
        return this.vendorQueues;
    }
    async configureVendorConcurrency(vendorId, concurrency) {
        const effectiveConcurrency = Math.min(concurrency, this.maxConcurrencyPerVendor);
        if (this.vendorQueues.has(vendorId)) {
            this.logger.log('Updating concurrency for vendor: ' + vendorId + ' to ' + effectiveConcurrency, VendorQueueService_1.name);
        }
        await this.getOrCreateVendorQueue(vendorId, effectiveConcurrency);
        this.logger.log('Vendor concurrency configured: ' + vendorId + ' = ' + effectiveConcurrency, VendorQueueService_1.name);
    }
    async getQueueStats(vendorId) {
        const queue = this.vendorQueues.get(vendorId);
        if (!queue) {
            return null;
        }
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
        ]);
        return {
            vendorId,
            queueName: this.getQueueName(vendorId),
            waiting,
            active,
            completed,
            failed,
            delayed,
        };
    }
    async getAllQueueStats() {
        const stats = [];
        for (const [vendorId, queue] of this.vendorQueues.entries()) {
            const stat = await this.getQueueStats(vendorId);
            if (stat) {
                stats.push(stat);
            }
        }
        return stats;
    }
};
exports.VendorQueueService = VendorQueueService;
exports.VendorQueueService = VendorQueueService = VendorQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('vendor-sync-base')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], VendorQueueService);
//# sourceMappingURL=vendor-queue.service.js.map