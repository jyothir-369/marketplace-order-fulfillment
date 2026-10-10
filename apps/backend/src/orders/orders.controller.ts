import { Throttle } from '@nestjs/throttler';
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
import { CheckoutRequestDto, CheckoutDto, CheckoutResponseDto, OrderResponseDto, TransitionOrderDto } from './dto/orders.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../common/entities/user.entity';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PaymentAuthorization } from '../common/entities/payment-authorization.entity';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async checkout(
    @Body() requestDto: CheckoutRequestDto,
    @CorrelationId() correlationId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CheckoutResponseDto> {
    // Derive buyer identity from verified JWT; never accept a client-supplied UUID.
    if (!user || !user.id) {
      throw new ForbiddenException('Buyer must be authenticated: buyerId must come from verified JWT identity');
    }
    // Reject any attempt to override identity via payload.
    const payloadKeys = Object.keys(requestDto || {});
    if (payloadKeys.includes('buyerId')) {
      throw new ForbiddenException('Client-supplied buyerId is not allowed');
    }
    const correctedDto: CheckoutDto = { ...requestDto, buyerId: user.id };
    return this.ordersService.checkout(correctedDto, correlationId, user.id);
  }

  // NOTE: static paths MUST precede :id — Express matches in declaration order,
  // so "buyer/:buyerId", "vendor/:vendorId", and "me" come first.

  /**
   * Support-only lookup. Buyers see their own orders via `GET /orders/me`
   * (resolves the identity from the bearer token, not a client-supplied id);
   * this path stays admin/operations for investigating arbitrary buyers.
   * (Phase 3.2 — was public and enumerable.)
   */
  @Get('buyer/:buyerId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS)
  async getOrdersByBuyer(
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByBuyer(buyerId);
  }

  /** Orders touching the vendor's line items. VENDORs are scoped to their own tenant. */
  @Get('vendor/:vendorId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.OPERATIONS)
  async getOrdersByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto[]> {
    // Phase 3.2: VENDORs may only read their own tenant's orders.
    if (user.role === UserRole.VENDOR && user.vendorId !== vendorId) {
      throw new ForbiddenException('You do not have access to this vendor');
    }
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
  @UseGuards(AuthGuard)
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.getOrderById(id, correlationId);
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERATIONS && order.buyerId !== user.id && order.buyerUserId !== user.id) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  /** Admin/operations audit trail for an order (Phase 1.5). */
  @Get(':id/audit')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS)
  async getOrderAudit(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ total: number; logs: unknown[] }> {
    return this.ordersService.getOrderAudit(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.getOrderById(id, correlationId);
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERATIONS && order.buyerId !== user.id && order.buyerUserId !== user.id) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return this.ordersService.cancelOrder(id, correlationId);
  }

  /**
   * Explicit refund of the order's captured payment (Phase 5.1). Admin/ops
   * financial reversal; buyer-initiated cancellations already refund inside
   * the cancel transaction.
   */
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS)
  async refundOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
  ): Promise<PaymentAuthorization | null> {
    return this.ordersService.refundOrder(id, correlationId);
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
