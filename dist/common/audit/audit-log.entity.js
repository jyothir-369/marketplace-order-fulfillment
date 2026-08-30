"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = exports.AuditEntityType = exports.AuditAction = void 0;
const typeorm_1 = require("typeorm");
var AuditAction;
(function (AuditAction) {
    AuditAction["INVENTORY_DECREMENT"] = "INVENTORY_DECREMENT";
    AuditAction["INVENTORY_RESTORE"] = "INVENTORY_RESTORE";
    AuditAction["ORDER_CREATED"] = "ORDER_CREATED";
    AuditAction["ORDER_STATUS_CHANGED"] = "ORDER_STATUS_CHANGED";
    AuditAction["FULFILLMENT_STATUS_CHANGED"] = "FULFILLMENT_STATUS_CHANGED";
    AuditAction["SYNC_JOB_CREATED"] = "SYNC_JOB_CREATED";
    AuditAction["SYNC_JOB_STATUS_CHANGED"] = "SYNC_JOB_STATUS_CHANGED";
    AuditAction["SYNC_JOB_RETRIED"] = "SYNC_JOB_RETRIED";
    AuditAction["SYNC_JOB_DEAD_LETTER"] = "SYNC_JOB_DEAD_LETTER";
    AuditAction["ADMIN_RESOLUTION"] = "ADMIN_RESOLUTION";
    AuditAction["ADMIN_ORDER_CANCEL"] = "ADMIN_ORDER_CANCEL";
    AuditAction["ADMIN_DEAD_LETTER_RETRY"] = "ADMIN_DEAD_LETTER_RETRY";
    AuditAction["RECONCILIATION_RESOLVED"] = "RECONCILIATION_RESOLVED";
    AuditAction["RECONCILIATION_FAILED"] = "RECONCILIATION_FAILED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditEntityType;
(function (AuditEntityType) {
    AuditEntityType["PRODUCT"] = "PRODUCT";
    AuditEntityType["ORDER"] = "ORDER";
    AuditEntityType["ORDER_LINE_ITEM"] = "ORDER_LINE_ITEM";
    AuditEntityType["VENDOR_SYNC_JOB"] = "VENDOR_SYNC_JOB";
})(AuditEntityType || (exports.AuditEntityType = AuditEntityType = {}));
let AuditLog = class AuditLog {
};
exports.AuditLog = AuditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AuditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, name: 'correlation_id' }),
    __metadata("design:type", String)
], AuditLog.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AuditAction,
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AuditEntityType,
    }),
    __metadata("design:type", String)
], AuditLog.prototype, "entityType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'entity_id' }),
    __metadata("design:type", String)
], AuditLog.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'previous_state' }),
    __metadata("design:type", Object)
], AuditLog.prototype, "previousState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'new_state' }),
    __metadata("design:type", Object)
], AuditLog.prototype, "newState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true, name: 'user_id' }),
    __metadata("design:type", String)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'metadata' }),
    __metadata("design:type", Object)
], AuditLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AuditLog.prototype, "createdAt", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, typeorm_1.Entity)('audit_logs'),
    (0, typeorm_1.Index)(['correlationId']),
    (0, typeorm_1.Index)(['entityType', 'entityId']),
    (0, typeorm_1.Index)(['action']),
    (0, typeorm_1.Index)(['createdAt'])
], AuditLog);
//# sourceMappingURL=audit-log.entity.js.map