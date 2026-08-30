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
exports.VendorConfigDto = exports.VendorFulfillmentResponseDto = exports.VendorFulfillmentRequestDto = exports.VendorResponseType = void 0;
const class_validator_1 = require("class-validator");
var VendorResponseType;
(function (VendorResponseType) {
    VendorResponseType["SUCCESS"] = "success";
    VendorResponseType["FAILURE"] = "failure";
    VendorResponseType["TIMEOUT"] = "timeout";
    VendorResponseType["DUPLICATE"] = "duplicate";
})(VendorResponseType || (exports.VendorResponseType = VendorResponseType = {}));
class VendorFulfillmentRequestDto {
}
exports.VendorFulfillmentRequestDto = VendorFulfillmentRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VendorFulfillmentRequestDto.prototype, "orderId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VendorFulfillmentRequestDto.prototype, "lineItemId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VendorFulfillmentRequestDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VendorFulfillmentRequestDto.prototype, "vendorId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], VendorFulfillmentRequestDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VendorFulfillmentRequestDto.prototype, "correlationId", void 0);
class VendorFulfillmentResponseDto {
}
exports.VendorFulfillmentResponseDto = VendorFulfillmentResponseDto;
class VendorConfigDto {
}
exports.VendorConfigDto = VendorConfigDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], VendorConfigDto.prototype, "successRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], VendorConfigDto.prototype, "timeoutMs", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(VendorResponseType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], VendorConfigDto.prototype, "forcedResponse", void 0);
//# sourceMappingURL=vendor-mock.dto.js.map