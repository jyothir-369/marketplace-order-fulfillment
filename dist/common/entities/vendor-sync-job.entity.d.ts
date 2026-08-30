import { OrderLineItem } from './order-line-item.entity';
export declare enum SyncJobStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    AMBIGUOUS = "ambiguous",
    DEAD_LETTER = "dead_letter"
}
export declare var MAX_RETRY_ATTEMPTS: number;
export declare class VendorSyncJob {
    id: string;
    orderLineItemId: string;
    orderLineItem: OrderLineItem;
    status: SyncJobStatus;
    attempts: number;
    maxAttempts: number;
    lastAttemptedAt: Date;
    completedAt: Date;
    vendorResponse: string;
    errorMessage: string;
    correlationId: string;
    createdAt: Date;
    updatedAt: Date;
}
