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
