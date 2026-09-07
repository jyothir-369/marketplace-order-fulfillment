import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminResolveDto, AdminDashboardDto, StuckOrdersResponseDto, AdminAuditLogResponseDto } from './dto/admin.dto';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { AuditEntityType, AuditAction } from '../common/audit';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard(@CorrelationId() correlationId: string): Promise<AdminDashboardDto> {
    return this.adminService.getDashboard(correlationId);
  }

  @Get('orders')
  async getOrders(
    @Query('status') status: string,
    @CorrelationId() correlationId: string,
  ): Promise<StuckOrdersResponseDto> {
    // GET /admin/orders?status=stuck
    // Returns orders with stuck fulfillment line items
    if (status === 'stuck') {
      return this.adminService.getStuckOrders(correlationId);
    }
    // Default: return empty result for non-stuck queries
    return { total: 0, orders: [] };
  }

  @Post('orders/:orderId/cancel')
  async cancelOrder(@Param('orderId', ParseUUIDPipe) orderId: string, @CorrelationId() correlationId: string): Promise<{ message: string }> {
    await this.adminService.cancelOrder(orderId, correlationId);
    return { message: 'Order cancelled' };
  }

  @Post('line-items/:lineItemId/resolve')
  async resolveLineItem(
    @Param('lineItemId', ParseUUIDPipe) lineItemId: string,
    @Body() dto: AdminResolveDto,
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string }> {
    await this.adminService.resolveOrderLineItem(lineItemId, dto, correlationId);
    return { message: 'Line item resolved' };
  }

  @Get('dead-letter')
  async getDeadLetterJobs(@CorrelationId() correlationId: string): Promise<VendorSyncJob[]> {
    return this.adminService.getDeadLetterDetails(correlationId);
  }

  @Post('dead-letter/:jobId/retry')
  async retryDeadLetterJob(@Param('jobId', ParseUUIDPipe) jobId: string, @CorrelationId() correlationId: string): Promise<{ message: string }> {
    await this.adminService.retryDeadLetterJob(jobId, correlationId);
    return { message: 'Job queued for retry' };
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('correlationId') correlationId?: string,
    @Query('entityType') entityType?: AuditEntityType,
    @Query('entityId') entityId?: string,
    @Query('action') action?: AuditAction,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @CorrelationId() parentCorrelationId?: string,
  ): Promise<AdminAuditLogResponseDto> {
    const queryCorrelationId = correlationId || parentCorrelationId || 'admin-query';
    const result = await this.adminService.getAuditLogs(
      {
        correlationId: queryCorrelationId,
        entityType: entityType as AuditEntityType,
        entityId,
        action: action as AuditAction,
        limit: limit || 100,
        offset: offset || 0,
      },
      queryCorrelationId,
    );

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

  @Get('trace/:correlationId')
  async getTrace(@Param('correlationId') correlationId: string): Promise<AdminAuditLogResponseDto> {
    const logs = await this.adminService.getTrace(correlationId);
    return {
      total: logs.length,
      logs: logs.map((log) => ({
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