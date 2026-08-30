import { AdminService } from './admin.service';
import { AdminResolveDto, AdminDashboardDto, StuckOrdersResponseDto, AdminAuditLogResponseDto } from './dto/admin.dto';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
import { AuditEntityType, AuditAction } from '../common/audit';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboard(correlationId: string): Promise<AdminDashboardDto>;
    getOrders(status: string, correlationId: string): Promise<StuckOrdersResponseDto>;
    cancelOrder(orderId: string, correlationId: string): Promise<{
        message: string;
    }>;
    resolveLineItem(lineItemId: string, dto: AdminResolveDto, correlationId: string): Promise<{
        message: string;
    }>;
    getDeadLetterJobs(correlationId: string): Promise<VendorSyncJob[]>;
    retryDeadLetterJob(jobId: string, correlationId: string): Promise<{
        message: string;
    }>;
    getAuditLogs(correlationId?: string, entityType?: AuditEntityType, entityId?: string, action?: AuditAction, limit?: number, offset?: number, parentCorrelationId?: string): Promise<AdminAuditLogResponseDto>;
    getTrace(correlationId: string): Promise<AdminAuditLogResponseDto>;
}
