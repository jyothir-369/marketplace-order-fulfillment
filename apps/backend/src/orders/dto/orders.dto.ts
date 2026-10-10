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

/** Public checkout request: buyer identity is derived server-side from the
 * verified JWT; client must NOT supply buyerId. */
export class CheckoutRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsIn([PAYMENT_SUCCESS_TOKEN, PAYMENT_DECLINE_TOKEN])
  paymentMethodToken?: string;
}

/** Internal checkout command (after controller verifies JWT identity). */
export class CheckoutDto {
  @IsUUID()
  buyerId: string;
  buyerUserId?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsOptional()
  @IsString()
  shippingAddress?: string;

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
  orderNumber: string | null;
  buyerId: string;
  buyerUserId?: string | null;
  status: OrderStatus;
  totalAmount: number;
  correlationId: string;
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

export const ORDER_TRANSITION_ACTIONS = ['CONFIRM', 'FULFILL', 'SHIP', 'CANCEL'] as const;
export type OrderTransitionAction = typeof ORDER_TRANSITION_ACTIONS[number];

export class TransitionOrderDto {
  @IsIn(ORDER_TRANSITION_ACTIONS)
  action: OrderTransitionAction;

  @IsOptional()
  @IsString()
  reason?: string;
}
