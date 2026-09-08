import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { UpsertCartDto, ValidateCartDto, CartResponseDto } from './dto/cart.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** GET /api/cart/:buyerId — session/user-keyed cart snapshot. */
  @Get(':buyerId')
  async getCart(
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
    @CorrelationId() correlationId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.getCart(buyerId, correlationId);
  }

  /** PUT /api/cart/:buyerId — full-sync upsert with inventory guard. */
  @Put(':buyerId')
  async upsertCart(
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
    @Body() dto: UpsertCartDto,
    @CorrelationId() correlationId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.upsertCart(dto, correlationId);
  }

  /** POST /api/cart/validate — pre-checkout inventory guard (non-mutating). */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateCart(
    @Body() dto: ValidateCartDto,
    @CorrelationId() correlationId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.validateCart(dto, correlationId);
  }

  /** DELETE /api/cart/:buyerId — clear cart after successful checkout. */
  @Delete(':buyerId')
  @HttpCode(HttpStatus.OK)
  async clearCart(
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
    @CorrelationId() correlationId: string,
  ): Promise<{ success: boolean }> {
    return this.cartService.clearCart(buyerId, correlationId);
  }
}
