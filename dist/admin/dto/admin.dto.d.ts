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
export declare class AdminOrderFilterDto {
    status?: string;
    vendorId?: string;
    type?: 'stuck' | 'all';
    limit?: number;
    offset?: number;
}
export declare class AdminOrderDto {
    orderId: string;
    buyerId: string;
    status: string;
    createdAt: Date;
    lineItems: StuckOrderLineItemDto[];
    stuckReason?: string;
}
export declare class AdminOrderResponseDto {
    total: number;
    orders: AdminOrderDto[];
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
