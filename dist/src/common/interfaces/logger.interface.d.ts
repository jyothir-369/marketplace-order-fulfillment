export interface ILogger {
    log(message: string, context?: string, correlationId?: string): void;
    error(message: string, trace?: string, context?: string, correlationId?: string): void;
    warn(message: string, context?: string, correlationId?: string): void;
    debug(message: string, context?: string, correlationId?: string): void;
}
export interface ICorrelationId {
    correlationId: string;
}
export interface AuditLogEntry {
    timestamp: Date;
    correlationId: string;
    action: string;
    entityType: string;
    entityId: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}
