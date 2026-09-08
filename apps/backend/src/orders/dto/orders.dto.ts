import { IsUUID, IsNumber, IsArray, ValidateNested, Min, ArrayMinSize, IsOptional, IsString } from 'class-validator';
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
