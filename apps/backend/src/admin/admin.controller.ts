import { Controller, Get, Post, Delete, Param, Body, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminResolveDto, AdminDashboardDto, StuckOrdersResponseDto, AdminAuditLogResponseDto, LinkUserDto, LinkedUserDto, AdminOrderListDto, AdminAnalyticsDto } from './dto/admin.dto';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { AuditEntityType, AuditAction } from '../common/audit';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATIONS)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard(@CorrelationId() correlationId: string): Promise<AdminDashboardDto> {
    return this.adminService.getDashboard(correlationId);
  }

  @Get('orders')
  async getOrders(
    @Query('status') status: string,
    @Query('type') type: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CorrelationId() correlationId: string,
  ): Promise<StuckOrdersResponseDto | AdminOrderListDto> {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    if (limitNum < 0 || offsetNum < 0 || (limitNum > 100 && limit !== '')) {
      // Invalid pagination — return empty paginated result rather than crash.
      return { total: 0, orders: [] };
    }
    if (status === 'stuck' || type === 'stuck') {
      return this.adminService.getStuckOrders(correlationId);
    }
    return this.adminService.getOrders(
      { status: status || undefined, limit: limitNum, offset: offsetNum },
      correlationId,
    );
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

  @Get('analytics')
  async getAnalytics(@CorrelationId() correlationId: string, @Query('days') days?: string): Promise<AdminAnalyticsDto> {
    return this.adminService.getAnalytics(correlationId, days ? parseInt(days, 10) : 14);
  }

  @Get('kpi')
  async getKPI(@CorrelationId() correlationId: string): Promise<any> {
    return this.adminService.getKPI(correlationId);
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
  @Get('vendors/:vendorId/users')
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS)
  async listLinkedUsers(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @CorrelationId() correlationId: string,
  ): Promise<LinkedUserDto[]> {
    return this.adminService.listLinkedUsers(vendorId, correlationId);
  }

  @Post('vendors/:vendorId/users')
  @Roles(UserRole.ADMIN)
  async linkUser(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Body() dto: LinkUserDto,
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string }> {
    return this.adminService.linkUser(vendorId, dto.email, correlationId);
  }

  @Delete('vendors/:vendorId/users/:userId')
  @Roles(UserRole.ADMIN)
  async unlinkUser(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string }> {
    return this.adminService.unlinkUser(vendorId, userId, correlationId);
  }
}
