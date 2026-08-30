import { Repository } from 'typeorm';
import { OrderLineItem } from '../common/entities/order-line-item.entity';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { Order } from '../common/entities/order.entity';
import { VendorMockService } from '../integrations/vendor-mock/vendor-mock.service';
import { SyncJobDto, ReconciliationResultDto, ManualResolutionDto } from './dto/fulfillment.dto';
export declare class FulfillmentService {
    private readonly lineItemRepository;
    private readonly syncJobRepository;
    private readonly orderRepository;
    private readonly vendorMockService;
    private readonly logger;
    constructor(lineItemRepository: Repository<OrderLineItem>, syncJobRepository: Repository<VendorSyncJob>, orderRepository: Repository<Order>, vendorMockService: VendorMockService);
    createSyncJob(dto: SyncJobDto): Promise<VendorSyncJob>;
    processSyncJob(jobId: string, correlationId: string): Promise<void>;
    handleSyncFailure(syncJob: any, errorMessage: any, correlationId: any): Promise<void>;
    reconcile(olderThanMinutes?: number): Promise<ReconciliationResultDto>;
    manualResolve(lineItemId: string, dto: ManualResolutionDto, correlationId: string): Promise<void>;
    checkOrderFulfillment(orderId: string, correlationId: string): Promise<void>;
    getDeadLetterJobs(): Promise<VendorSyncJob[]>;
    getAmbiguousJobs(): Promise<VendorSyncJob[]>;
}
