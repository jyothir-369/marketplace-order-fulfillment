import { InventoryService } from './inventory.service';
import { StockInfoDto } from './dto/inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getStockInfo(productId: string): Promise<StockInfoDto>;
}
