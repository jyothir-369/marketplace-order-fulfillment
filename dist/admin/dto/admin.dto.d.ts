import { FulfillmentStatus } from '../../common/entities';
export declare class AdminResolveDto {
    newFulfillmentStatus: FulfillmentStatus;
    reason?: string;
    vendorReference?: string;
}
export declare class AdminDashboardDto {
    totalOrders: number;
    pendingOrders: number;
    fulfillingOrders: number;
    fulfilledOrders: number;
    cancelledOrders: number;
    deadLetterJobs: number;
    ambiguousJobs: number;
}
export declare class StuckOrderLineItemDto {
    lineItemId: string;
    productId: string;
    vendorId: string;
    fulfillmentStatus: FulfillmentStatus;
    failureReason?: string;
    attempts: number;
    lastAttemptedAt?: Date;
}
export declare class StuckOrderDto {
    orderId: string;
    buyerId: string;
    status: string;
    createdAt: Date;
    stuckReason: string;
    stuckLineItems: StuckOrderLineItemDto[];
}
export declare class StuckOrdersResponseDto {
    total: number;
    orders: StuckOrderDto[];
}
export declare class AdminAuditLogDto {
    id: string;
    correlationId: string;
    action: string;
    entityType: string;
    entityId: string;
    message: string;
    userId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}
export declare class AdminAuditLogResponseDto {
    total: number;
    logs: AdminAuditLogDto[];
}
