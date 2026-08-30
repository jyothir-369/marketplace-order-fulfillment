import { IsUUID, IsNumber, Min } from 'class-validator';

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