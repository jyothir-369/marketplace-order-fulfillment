import { IsUUID, IsNumber, IsArray, ValidateNested, Min, ArrayMinSize, IsOptional, IsString, IsIn, IsInt, Min as MinInt } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../common/entities/order.entity';
import { FulfillmentStatus } from '../../common/entities/order-line-item.entity';

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
   * Client-generated idempotency key. When provided, a retry of the same
   * checkout key returns the previously created order instead of a duplicate.
   */
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

/**
 * Order lifecycle actions exposed to vendors.
 * CONFIRM: placed -> confirmed
 * FULFILL: confirmed -> fulfilling
 * SHIP:    fulfilling -> fulfilled
 * CANCEL:  placed|confirmed|fulfilling -> cancelled (restores inventory)
 */
export const ORDER_TRANSITION_ACTIONS = ['CONFIRM', 'FULFILL', 'SHIP', 'CANCEL'] as const;
export type OrderTransitionAction = (typeof ORDER_TRANSITION_ACTIONS)[number];

export class TransitionOrderDto {
  @IsIn(ORDER_TRANSITION_ACTIONS as readonly string[])
  action: OrderTransitionAction;

  @IsOptional()
  @IsString()
  reason?: string;

  /**
   * Optional actor (vendor/user) identifier for audit attribution.
   */
  @IsOptional()
  @IsUUID()
  actorId?: string;
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
  /** Human-readable order number (e.g. ORD-20260902-A1B2). */
  orderNumber: string;

  id: string;
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

/**
 * Paginated order list query params for GET /api/orders.
 */
export class PaginatedOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @MinInt(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @MinInt(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;
}

export class PaginatedOrdersResponseDto {
  total: number;
  page: number;
  limit: number;
  orders: OrderResponseDto[];
}