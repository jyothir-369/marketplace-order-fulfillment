"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorMockModule = void 0;
const common_1 = require("@nestjs/common");
const vendor_mock_controller_1 = require("./vendor-mock.controller");
const vendor_mock_service_1 = require("./vendor-mock.service");
let VendorMockModule = class VendorMockModule {
};
exports.VendorMockModule = VendorMockModule;
exports.VendorMockModule = VendorMockModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        controllers: [vendor_mock_controller_1.VendorMockController],
        providers: [vendor_mock_service_1.VendorMockService],
        exports: [vendor_mock_service_1.VendorMockService],
    })
], VendorMockModule);
//# sourceMappingURL=vendor-mock.module.js.map