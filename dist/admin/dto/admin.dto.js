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
exports.AdminAuditLogResponseDto = exports.AdminAuditLogDto = exports.AdminOrderResponseDto = exports.AdminOrderDto = exports.AdminOrderFilterDto = exports.StuckOrderLineItemDto = exports.AdminDashboardDto = exports.AdminResolveDto = void 0;
const class_validator_1 = require("class-validator");
const entities_1 = require("../../common/entities");
class AdminResolveDto {
}
exports.AdminResolveDto = AdminResolveDto;
__decorate([
    (0, class_validator_1.IsEnum)(entities_1.FulfillmentStatus),
    __metadata("design:type", String)
], AdminResolveDto.prototype, "newFulfillmentStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdminResolveDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AdminResolveDto.prototype, "vendorReference", void 0);
class AdminDashboardDto {
}
exports.AdminDashboardDto = AdminDashboardDto;
class StuckOrderLineItemDto {
}
exports.StuckOrderLineItemDto = StuckOrderLineItemDto;
class AdminOrderFilterDto {
}
exports.AdminOrderFilterDto = AdminOrderFilterDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminOrderFilterDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminOrderFilterDto.prototype, "vendorId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminOrderFilterDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AdminOrderFilterDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], AdminOrderFilterDto.prototype, "offset", void 0);
class AdminOrderDto {
}
exports.AdminOrderDto = AdminOrderDto;
class AdminOrderResponseDto {
}
exports.AdminOrderResponseDto = AdminOrderResponseDto;
class AdminAuditLogDto {
}
exports.AdminAuditLogDto = AdminAuditLogDto;
class AdminAuditLogResponseDto {
}
exports.AdminAuditLogResponseDto = AdminAuditLogResponseDto;
//# sourceMappingURL=admin.dto.js.map