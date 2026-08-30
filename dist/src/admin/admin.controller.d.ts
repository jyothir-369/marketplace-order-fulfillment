import { AdminService } from './admin.service';
import { AdminResolveDto, AdminDashboardDto } from './dto/admin.dto';
import { VendorSyncJob } from '../common/entities/vendor-sync-job.entity';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboard(correlationId: string): Promise<AdminDashboardDto>;
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
}
