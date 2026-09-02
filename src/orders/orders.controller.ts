import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto, CheckoutResponseDto, OrderResponseDto, TransitionOrderDto } from './dto/orders.dto';
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

  /**
   * Vendor-scoped order listing. Returns any order that contains a line item
   * for the given vendor.
   */
  @Get('vendor/:vendorId')
  async getOrdersByVendor(@Param('vendorId', ParseUUIDPipe) vendorId: string): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByVendor(vendorId);
  }

  /**
   * Drive an order through its lifecycle via a single vendor-facing action.
   */
  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  async transitionOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionOrderDto,
    @CorrelationId() correlationId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.transitionOrder(id, dto, correlationId);
  }

  /**
   * Returns the audit log entries for a single order, scoped to ORDER entity
   * type. Backed by the same query path used by /admin/audit-logs.
   */
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
