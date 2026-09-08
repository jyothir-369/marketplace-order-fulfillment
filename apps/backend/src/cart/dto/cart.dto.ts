import { IsUUID, IsArray, ValidateNested, ArrayMinSize, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StockAvailabilityItem } from '../../inventory/dto/inventory.dto';

export class CartItemDto {
  @IsUUID()
  productId: string;

  @IsString()
  name: string;

  @IsString()
  vendorName: string;

  @IsUUID()
  vendorId: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(1)
  maxStock: number;
}

export class UpsertCartDto {
  /** Stable session key (guest session id or authenticated buyer id). */
  @IsUUID()
  buyerId: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}

export class ValidateCartDto {
  @IsUUID()
  buyerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}

export class CartItemResponseDto {
  productId: string;
  name: string;
  vendorId: string;
  vendorName: string;
  imageUrl?: string;
  @IsNumber()
  @Min(1)
  quantity: number;
  @IsNumber()
  @Min(0)
  unitPrice: number;
  lineTotal: number;
  @IsNumber()
  @Min(1)
  maxStock: number;
}

export class CartResponseDto {
  buyerId: string;
  items: CartItemResponseDto[];
  itemCount: number;
  subtotal: number;
  validation?: {
    available: boolean;
    items: StockAvailabilityItem[];
  };
  updatedAt: string;
}
