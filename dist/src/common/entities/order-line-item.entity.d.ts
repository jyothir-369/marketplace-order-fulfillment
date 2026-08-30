import { Order } from './order.entity';
import { Product } from './product.entity';
import { Vendor } from './vendor.entity';
import { VendorSyncJob } from './vendor-sync-job.entity';
export declare enum FulfillmentStatus {
    PENDING = "pending",
    SYNCING = "syncing",
    CONFIRMED = "confirmed",
    FAILED = "failed",
    DEAD_LETTER = "dead_letter",
    AMBIGUOUS = "ambiguous"
}
export declare class OrderLineItem {
    id: string;
    orderId: string;
    order: Order;
    productId: string;
    product: Product;
    vendorId: string;
    vendor: Vendor;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    fulfillmentStatus: FulfillmentStatus;
    vendorReference: string;
    failureReason: string;
    syncJob: VendorSyncJob;
    createdAt: Date;
    updatedAt: Date;
}
