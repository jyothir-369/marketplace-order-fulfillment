import { FulfillmentStatus } from '../../common/entities';
export declare class SyncJobDto {
    orderLineItemId: string;
    orderId: string;
    vendorId: string;
    correlationId: string;
}
export declare class ReconciliationResultDto {
    processed: number;
    resolved: number;
    stillAmbiguous: number;
    errors: string[];
}
export declare class ManualResolutionDto {
    newStatus: FulfillmentStatus;
    reason?: string;
    vendorReference?: string;
}
