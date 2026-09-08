import { IsUUID, IsNumber, Min, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class StockCheckItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ValidateStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockCheckItemDto)
  items: StockCheckItemDto[];
}

export class StockAvailabilityItem {
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
}

export class StockAvailabilityResult {
  available: boolean;
  items: StockAvailabilityItem[];
}

export class DecrementStockDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class StockOperationResult {
  success: boolean;
  productId: string;
  previousStock: number;
  newStock: number;
  requestedQuantity: number;
  message?: string;
}

export class StockInfoDto {
  productId: string;
  currentStock: number;
  isAvailable: boolean;
}