export declare class DecrementStockDto {
    productId: string;
    quantity: number;
}
export declare class StockOperationResult {
    success: boolean;
    productId: string;
    previousStock: number;
    newStock: number;
    requestedQuantity: number;
    message?: string;
}
export declare class StockInfoDto {
    productId: string;
    currentStock: number;
    isAvailable: boolean;
}
