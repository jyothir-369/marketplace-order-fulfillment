import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { FulfillmentService } from './fulfillment.service';
export declare var VENDOR_SYNC_QUEUE: string;
export interface VendorSyncJobData {
    jobId: string;
    orderLineItemId: string;
    vendorId: string;
    correlationId: string;
}
export declare class VendorSyncProcessor extends WorkerHost {
    private readonly fulfillmentService;
    private readonly logger;
    constructor(fulfillmentService: FulfillmentService);
    process(job: Job<VendorSyncJobData>): Promise<void>;
    onActive(job: Job<VendorSyncJobData>): void;
    onCompleted(job: Job<VendorSyncJobData>): void;
    onFailed(job: Job<VendorSyncJobData>, error: Error): void;
    onStalled(jobId: string): void;
}
