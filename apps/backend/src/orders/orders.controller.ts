import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto, CheckoutResponseDto, OrderResponseDto } from './dto/orders.dto';
import { OrderStatus } from '../common/entities';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Body() dto: CheckoutDto, @CorrelationId() correlationId: string): Promise<CheckoutResponseDto> {
    return this.ordersService.checkout(dto, correlationId);
  }

  // NOTE: static path first — Express matches in declaration order, so
  // `buyer/:buyerId` must precede `:id` or "buyer" gets captured as the id.
  @Get('buyer/:buyerId')
  async getOrdersByBuyer(@Param('buyerId', ParseUUIDPipe) buyerId: string): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByBuyer(buyerId);
  }

  @Get(':id')
  async getOrder(@Param('id', ParseUUIDPipe) id: string, @CorrelationId() correlationId: string): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, correlationId);
  }

  // Wired in Phase 0: the service method (with stock restore + audit) existed
  // but was not exposed via a route; the storefront cancel action now resolves.
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(id, correlationId);
  }
}