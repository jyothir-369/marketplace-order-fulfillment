import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditEntityType } from './audit-log.entity';
export interface AuditLogEntry {
    correlationId: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    previousState?: Record<string, any>;
    newState?: Record<string, any>;
    userId?: string;
    message?: string;
    metadata?: Record<string, any>;
}
export interface AuditLogQuery {
    correlationId?: string;
    entityType?: AuditEntityType;
    entityId?: string;
    action?: AuditAction;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
}
export declare class AuditService {
    private readonly auditRepository;
    private readonly logger;
    constructor(auditRepository: Repository<AuditLog>);
    log(entry: AuditLogEntry): Promise<AuditLog>;
    logInventoryDecrement(correlationId: string, productId: string, previousStock: number, newStock: number, quantity: number, orderId?: string): Promise<void>;
    logInventoryRestore(correlationId: string, productId: string, previousStock: number, newStock: number, quantity: number, reason: string): Promise<void>;
    logOrderCreated(correlationId: string, orderId: string, buyerId: string, totalAmount: number): Promise<void>;
    logOrderStatusChange(correlationId: string, orderId: string, previousStatus: string, newStatus: string, userId?: string): Promise<void>;
    logFulfillmentStatusChange(correlationId: string, lineItemId: string, previousStatus: string, newStatus: string, orderId?: string, vendorReference?: string): Promise<void>;
    logSyncJobCreated(correlationId: string, syncJobId: string, lineItemId: string, vendorId: string): Promise<void>;
    logSyncJobStatusChange(correlationId: string, syncJobId: string, previousStatus: string, newStatus: string, attempts?: number): Promise<void>;
    logSyncJobDeadLetter(correlationId: string, syncJobId: string, errorMessage: string, attempts: number): Promise<void>;
    logAdminResolution(correlationId: string, lineItemId: string, previousStatus: string, newStatus: string, adminUserId: string, reason?: string): Promise<void>;
    logAdminOrderCancel(correlationId: string, orderId: string, adminUserId: string, previousStatus: string): Promise<void>;
    logAdminDeadLetterRetry(correlationId: string, syncJobId: string, adminUserId: string): Promise<void>;
    logReconciliationResolved(correlationId: string, syncJobId: string, resolution: string): Promise<void>;
    queryLogs(query: AuditLogQuery): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    getTrace(correlationId: string): Promise<AuditLog[]>;
}
