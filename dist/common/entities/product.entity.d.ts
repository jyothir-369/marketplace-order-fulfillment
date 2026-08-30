import { Vendor } from './vendor.entity';
import { OrderLineItem } from './order-line-item.entity';
export declare class Product {
    id: string;
    vendorId: string;
    vendor: Vendor;
    name: string;
    price: number;
    stockCount: number;
    isActive: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    orderLineItems: OrderLineItem[];
}
