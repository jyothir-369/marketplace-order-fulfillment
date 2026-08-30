import { Queue } from 'bullmq';
import { FulfillmentService } from './fulfillment.service';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { VendorSyncJobData } from './vendor-sync.processor';
import { ReconciliationResultDto } from './dto/fulfillment.dto';
export declare class FulfillmentController {
    private readonly fulfillmentService;
    private readonly syncQueue;
    constructor(fulfillmentService: FulfillmentService, syncQueue: Queue<VendorSyncJobData>);
    enqueueSyncJob(orderLineItemId: string, body: {
        orderId: string;
        vendorId: string;
    }, correlationId: string): Promise<{
        message: string;
        jobId: string;
    }>;
    runReconciliation(body: {
        olderThanMinutes?: number;
    }): Promise<ReconciliationResultDto>;
    getDeadLetterJobs(): Promise<VendorSyncJob[]>;
    getAmbiguousJobs(): Promise<VendorSyncJob[]>;
}
