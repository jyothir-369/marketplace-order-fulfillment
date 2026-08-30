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
exports.ManualResolutionDto = exports.ReconciliationResultDto = exports.SyncJobDto = void 0;
const class_validator_1 = require("class-validator");
const entities_1 = require("../../common/entities");
class SyncJobDto {
}
exports.SyncJobDto = SyncJobDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SyncJobDto.prototype, "orderLineItemId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SyncJobDto.prototype, "orderId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SyncJobDto.prototype, "vendorId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncJobDto.prototype, "correlationId", void 0);
class ReconciliationResultDto {
}
exports.ReconciliationResultDto = ReconciliationResultDto;
class ManualResolutionDto {
}
exports.ManualResolutionDto = ManualResolutionDto;
__decorate([
    (0, class_validator_1.IsEnum)(entities_1.FulfillmentStatus),
    __metadata("design:type", String)
], ManualResolutionDto.prototype, "newStatus", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ManualResolutionDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ManualResolutionDto.prototype, "vendorReference", void 0);
//# sourceMappingURL=fulfillment.dto.js.map