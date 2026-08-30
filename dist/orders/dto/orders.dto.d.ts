import { OrderStatus } from '../../common/entities/order.entity';
import { FulfillmentStatus } from '../../common/entities/order-line-item.entity';
export declare class CheckoutItemDto {
    productId: string;
    quantity: number;
}
export declare class CheckoutDto {
    buyerId: string;
    items: CheckoutItemDto[];
    shippingAddress?: string;
}
export declare class OrderLineItemResponseDto {
    id: string;
    productId: string;
    productName: string;
    vendorId: string;
    vendorName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    fulfillmentStatus: FulfillmentStatus;
    vendorReference?: string;
    failureReason?: string;
}
export declare class OrderResponseDto {
    id: string;
    buyerId: string;
    status: OrderStatus;
    totalAmount: number;
    correlationId: string;
    shippingAddress?: string;
    lineItems: OrderLineItemResponseDto[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class CheckoutResponseDto {
    success: boolean;
    order?: OrderResponseDto;
    message: string;
    correlationId: string;
}
