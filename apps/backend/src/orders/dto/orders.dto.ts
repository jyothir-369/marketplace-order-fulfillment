import { IsUUID, IsNumber, IsArray, ValidateNested, Min, ArrayMinSize, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../common/entities/order.entity';
import { FulfillmentStatus } from '../../common/entities/order-line-item.entity';
import { PAYMENT_SUCCESS_TOKEN, PAYMENT_DECLINE_TOKEN } from '../../payments/mock-payment.service';

export class CheckoutItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CheckoutDto {
  @IsUUID()
  buyerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  /**
   * Shipping address for the order.
   * Added as part of Phase 7 expand-and-contract migration.
   * Optional to maintain backward compatibility during transition.
   */
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  /**
   * Phase 5.1 — mock payment selection (`mock-success` | `mock-decline`).
   * Absent, the mock provider authorizes deterministically.
   */
  @IsOptional()
  @IsIn([PAYMENT_SUCCESS_TOKEN, PAYMENT_DECLINE_TOKEN])
  paymentMethodToken?: string;
}

export class OrderLineItemResponseDto {
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

export class OrderResponseDto {
  id: string;
  /**
   * Human-facing order reference (Phase 2.2) — null for orders placed before
   * the order_number sequence was provisioned.
   */
  orderNumber: string | null;
  buyerId: string;
  status: OrderStatus;
  totalAmount: number;
  correlationId: string;
  
  /**
   * Shipping address for the order.
   * Added as part of Phase 7 expand-and-contract migration.
   */
  shippingAddress?: string;
  
  lineItems: OrderLineItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class CheckoutResponseDto {
  success: boolean;
  order?: OrderResponseDto;
  message: string;
  correlationId: string;
}

/** Transition actions along the order lifecycle (Phase 2 — vendor/ops routes). */
export type OrderTransitionAction = 'CONFIRM' | 'FULFILL' | 'SHIP' | 'CANCEL';

export const ORDER_TRANSITION_ACTIONS: OrderTransitionAction[] = ['CONFIRM', 'FULFILL', 'SHIP', 'CANCEL'];

export class TransitionOrderDto {
  @IsIn(ORDER_TRANSITION_ACTIONS)
  action: OrderTransitionAction;

  @IsOptional()
  @IsString()
  reason?: string;
}
