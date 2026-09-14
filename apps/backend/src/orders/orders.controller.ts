import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto, CheckoutResponseDto, OrderResponseDto, TransitionOrderDto } from './dto/orders.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '../common/entities/user.entity';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Body() dto: CheckoutDto, @CorrelationId() correlationId: string): Promise<CheckoutResponseDto> {
    return this.ordersService.checkout(dto, correlationId);
  }

  // NOTE: static paths MUST precede :id — Express matches in declaration order,
  // so "buyer/:buyerId", "vendor/:vendorId", and "me" come first.

  @Get('buyer/:buyerId')
  async getOrdersByBuyer(
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByBuyer(buyerId);
  }

  /** Orders touching the vendor's line items. */
  @Get('vendor/:vendorId')
  async getOrdersByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByVendor(vendorId);
  }

  /** Orders placed by the currently authenticated buyer. */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMyOrders(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersForCurrentUser(user.id);
  }

  @Get(':id')
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, correlationId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(id, correlationId);
  }

  /** Lifecycle transition: CONFIRM / FULFILL / SHIP / CANCEL. */
  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.OPERATIONS)
  async transitionOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionOrderDto,
    @CorrelationId() correlationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionOrder(id, dto, correlationId, user?.id);
  }
}
