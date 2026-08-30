import { FulfillmentService } from './fulfillment.service';
export declare class ReconciliationScheduler {
    private readonly fulfillmentService;
    private readonly logger;
    constructor(fulfillmentService: FulfillmentService);
    handleReconciliation(): Promise<void>;
}
