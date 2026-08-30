import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { FulfillmentService } from './fulfillment.service';
import { VendorQueueService, VendorQueueJobData } from './vendor-queue.service';
export interface VendorWorkerConfig {
    vendorId: string;
    concurrency: number;
}
export declare class VendorSyncIsolatedProcessor extends WorkerHost {
    private readonly fulfillmentService;
    private readonly vendorQueueService;
    private readonly logger;
    private vendorWorker;
    private isInitialized;
    constructor(fulfillmentService: FulfillmentService, vendorQueueService: VendorQueueService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    processJob(job: Job<VendorQueueJobData>): Promise<void>;
    process(job: Job<VendorQueueJobData>): Promise<void>;
    onActive(job: Job<VendorQueueJobData>): void;
    onCompleted(job: Job<VendorQueueJobData>): void;
    onFailed(job: Job<VendorQueueJobData> | undefined, error: Error): void;
    onStalled(jobId: string): void;
}
