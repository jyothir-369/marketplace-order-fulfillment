import { IsUUID, IsNumber, Min, IsInt, IsString, MinLength } from 'class-validator';

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

export class AdjustStockDto {
  @IsInt()
  delta: number;

  @IsString()
  @MinLength(3)
  reason: string;
}

export class StockInfoDto {
  productId: string;
  currentStock: number;
  isAvailable: boolean;
}