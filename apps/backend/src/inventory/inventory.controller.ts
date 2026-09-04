import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StockInfoDto } from './dto/inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  async getStockInfo(@Param('productId', ParseUUIDPipe) productId: string): Promise<StockInfoDto> {
    return this.inventoryService.getStockInfo(productId);
  }
}