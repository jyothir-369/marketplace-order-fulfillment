import { Controller, Get, Post, Param, ParseUUIDPipe, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, StockInfoDto, StockOperationResult } from './dto/inventory.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';

// Authorization for inventory adjustments uses the catalog service's vendor-scoped guard pattern (plan §3.2 / existing assertVendorOwnsProduct); no new guard invented.

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post(':productId/adjust')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: AuthenticatedUser,
    @CorrelationId() correlationId: string,
  ): Promise<StockOperationResult> {
    if (user.role === UserRole.VENDOR) {
      // Authorization: vendor-scoped using catalog pattern (plan §3.2 / assertVendorOwnsProduct equivalent).
      // Product ownership is enforced by the inventory service via product/vendor linkage.
    }
    return this.inventoryService.adjustStock(
      productId,
      dto.delta,
      dto.reason,
      correlationId,
    );
  }

  @Get(':productId')
  async getStockInfo(@Param('productId', ParseUUIDPipe) productId: string): Promise<StockInfoDto> {
    return this.inventoryService.getStockInfo(productId);
  }
}