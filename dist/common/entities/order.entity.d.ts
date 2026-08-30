import { OrderLineItem } from './order-line-item.entity';
export declare enum OrderStatus {
    PLACED = "placed",
    CONFIRMED = "confirmed",
    FULFILLING = "fulfilling",
    FULFILLED = "fulfilled",
    CANCELLED = "cancelled"
}
export declare class Order {
    id: string;
    buyerId: string;
    status: OrderStatus;
    totalAmount: number;
    correlationId: string;
    shippingAddress: string;
    createdAt: Date;
    updatedAt: Date;
    lineItems: OrderLineItem[];
}
