export declare enum AuditAction {
    INVENTORY_DECREMENT = "INVENTORY_DECREMENT",
    INVENTORY_RESTORE = "INVENTORY_RESTORE",
    ORDER_CREATED = "ORDER_CREATED",
    ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED",
    FULFILLMENT_STATUS_CHANGED = "FULFILLMENT_STATUS_CHANGED",
    SYNC_JOB_CREATED = "SYNC_JOB_CREATED",
    SYNC_JOB_STATUS_CHANGED = "SYNC_JOB_STATUS_CHANGED",
    SYNC_JOB_RETRIED = "SYNC_JOB_RETRIED",
    SYNC_JOB_DEAD_LETTER = "SYNC_JOB_DEAD_LETTER",
    ADMIN_RESOLUTION = "ADMIN_RESOLUTION",
    ADMIN_ORDER_CANCEL = "ADMIN_ORDER_CANCEL",
    ADMIN_DEAD_LETTER_RETRY = "ADMIN_DEAD_LETTER_RETRY",
    RECONCILIATION_RESOLVED = "RECONCILIATION_RESOLVED",
    RECONCILIATION_FAILED = "RECONCILIATION_FAILED"
}
export declare enum AuditEntityType {
    PRODUCT = "PRODUCT",
    ORDER = "ORDER",
    ORDER_LINE_ITEM = "ORDER_LINE_ITEM",
    VENDOR_SYNC_JOB = "VENDOR_SYNC_JOB"
}
export declare class AuditLog {
    id: string;
    correlationId: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    previousState: Record<string, any>;
    newState: Record<string, any>;
    userId: string;
    message: string;
    metadata: Record<string, any>;
    createdAt: Date;
}
