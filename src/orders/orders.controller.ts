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

  @Get(':id')
  async getOrder(@Param('id', ParseUUIDPipe) id: string, @CorrelationId() correlationId: string): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, correlationId);
  }

  @Get('buyer/:buyerId')
  async getOrdersByBuyer(@Param('buyerId', ParseUUIDPipe) buyerId: string): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByBuyer(buyerId);
  }
}