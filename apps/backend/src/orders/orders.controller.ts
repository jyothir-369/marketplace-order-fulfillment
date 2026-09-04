import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CheckoutDto,
  CheckoutResponseDto,
  OrderResponseDto,
  TransitionOrderDto,
  PaginatedOrdersQueryDto,
  PaginatedOrdersResponseDto,
} from './dto/orders.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { AdminAuditLogResponseDto } from '../admin/dto/admin.dto';
import { AuditService, AuditEntityType } from '../common/audit';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly auditService: AuditService,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @Body() dto: CheckoutDto,
    @CorrelationId() correlationId: string,
  ): Promise<CheckoutResponseDto> {
    return this.ordersService.checkout(dto, correlationId);
  }

  /**
   * Global paginated orders listing (admin/buyer-dashboard use).
   * Example: GET /api/orders?page=1&limit=20&status=placed
   * Must be declared BEFORE the `:id` route so "orders" doesn't match the UUID param.
   */
  @Get()
  async getOrdersPaginated(
    @Query() query: PaginatedOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    return this.ordersService.getOrdersPaginated(query);
  }

  @Get(':id')
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, correlationId);
  }

  @Get('buyer/:buyerId')
  async getOrdersByBuyer(
    @Param('buyerId', ParseUUIDPipe) buyerId: string,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByBuyer(buyerId);
  }

  /**
   * Vendor-scoped order listing.
   */
  @Get('vendor/:vendorId')
  async getOrdersByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByVendor(vendorId);
  }

  /**
   * Drive an order through its lifecycle.
   */
  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  async transitionOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionOrderDto,
    @CorrelationId() correlationId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionOrder(id, dto, correlationId, dto.actorId);
  }

  @Get(':id/audit-logs')
  async getOrderAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CorrelationId() correlationId: string,
  ): Promise<AdminAuditLogResponseDto> {
    const result = await this.auditService.queryLogs({
      correlationId,
      entityType: AuditEntityType.ORDER,
      entityId: id,
      limit: 200,
      offset: 0,
    });

    return {
      total: result.total,
      logs: result.logs.map((log) => ({
        id: log.id,
        correlationId: log.correlationId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        message: log.message || '',
        userId: log.userId || undefined,
        metadata: log.metadata || undefined,
        createdAt: log.createdAt,
      })),
    };
  }
}