import { Queue } from 'bullmq';
import { FulfillmentService } from './fulfillment.service';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { VendorSyncJobData } from './vendor-sync.processor';
import { VendorQueueService } from './vendor-queue.service';
import { ReconciliationResultDto } from './dto/fulfillment.dto';
export declare class FulfillmentController {
    private readonly fulfillmentService;
    private readonly vendorQueueService;
    private readonly syncQueue;
    constructor(fulfillmentService: FulfillmentService, vendorQueueService: VendorQueueService, syncQueue: Queue<VendorSyncJobData>);
    enqueueSyncJob(orderLineItemId: string, body: {
        orderId: string;
        vendorId: string;
    }, correlationId: string): Promise<{
        message: string;
        jobId: string;
        vendorId: string;
        queueName: string;
    }>;
    enqueueSyncJobLegacy(orderLineItemId: string, body: {
        orderId: string;
        vendorId: string;
    }, correlationId: string): Promise<{
        message: string;
        jobId: string;
        queueName: string;
    }>;
    configureVendor(vendorId: string, body: {
        concurrency?: number;
    }, correlationId: string): Promise<{
        message: string;
        vendorId: string;
        concurrency: number;
        queueName: string;
    }>;
    runReconciliation(body: {
        olderThanMinutes?: number;
    }): Promise<ReconciliationResultDto>;
    getQueueStats(vendorId?: string): Promise<any>;
    getDeadLetterJobs(): Promise<VendorSyncJob[]>;
    getAmbiguousJobs(): Promise<VendorSyncJob[]>;
}
