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
exports.VendorSyncJob = exports.MAX_RETRY_ATTEMPTS = exports.SyncJobStatus = void 0;
const typeorm_1 = require("typeorm");
const order_line_item_entity_1 = require("./order-line-item.entity");
var SyncJobStatus;
(function (SyncJobStatus) {
    SyncJobStatus["PENDING"] = "pending";
    SyncJobStatus["IN_PROGRESS"] = "in_progress";
    SyncJobStatus["COMPLETED"] = "completed";
    SyncJobStatus["FAILED"] = "failed";
    SyncJobStatus["AMBIGUOUS"] = "ambiguous";
    SyncJobStatus["DEAD_LETTER"] = "dead_letter";
})(SyncJobStatus || (exports.SyncJobStatus = SyncJobStatus = {}));
exports.MAX_RETRY_ATTEMPTS = 5;
let VendorSyncJob = class VendorSyncJob {
};
exports.VendorSyncJob = VendorSyncJob;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorSyncJob.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'order_line_item_id' }),
    __metadata("design:type", String)
], VendorSyncJob.prototype, "orderLineItemId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => order_line_item_entity_1.OrderLineItem, (lineItem) => lineItem.syncJob),
    (0, typeorm_1.JoinColumn)({ name: 'order_line_item_id' }),
    __metadata("design:type", order_line_item_entity_1.OrderLineItem)
], VendorSyncJob.prototype, "orderLineItem", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SyncJobStatus,
        default: SyncJobStatus.PENDING,
    }),
    __metadata("design:type", String)
], VendorSyncJob.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], VendorSyncJob.prototype, "attempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: exports.MAX_RETRY_ATTEMPTS, name: 'max_attempts' }),
    __metadata("design:type", Number)
], VendorSyncJob.prototype, "maxAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'last_attempted_at' }),
    __metadata("design:type", Date)
], VendorSyncJob.prototype, "lastAttemptedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'completed_at' }),
    __metadata("design:type", Date)
], VendorSyncJob.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true, name: 'vendor_response' }),
    __metadata("design:type", String)
], VendorSyncJob.prototype, "vendorResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'error_message' }),
    __metadata("design:type", String)
], VendorSyncJob.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true, name: 'correlation_id' }),
    __metadata("design:type", String)
], VendorSyncJob.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], VendorSyncJob.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], VendorSyncJob.prototype, "updatedAt", void 0);
exports.VendorSyncJob = VendorSyncJob = __decorate([
    (0, typeorm_1.Entity)('vendor_sync_jobs'),
    (0, typeorm_1.Index)(['status', 'lastAttemptedAt'])
], VendorSyncJob);
//# sourceMappingURL=vendor-sync-job.entity.js.map