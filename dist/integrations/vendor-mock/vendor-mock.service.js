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
var VendorMockService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorMockService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const vendor_mock_dto_1 = require("./dto/vendor-mock.dto");
let VendorMockService = VendorMockService_1 = class VendorMockService {
    constructor() {
        this.logger = new common_1.Logger(VendorMockService_1.name);
        this.simulationConfigs = new Map();
        this.setDefaultConfig();
    }
    setDefaultConfig() {
        this.simulationConfigs.set('default', {
            successRate: 0.9,
            timeoutMs: 500,
        });
    }
    configureVendor(vendorId, config) {
        this.simulationConfigs.set(vendorId, {
            successRate: config.successRate !== undefined ? config.successRate : 0.9,
            timeoutMs: config.timeoutMs !== undefined ? config.timeoutMs : 500,
            forcedResponse: config.forcedResponse,
        });
        this.logger.log('Vendor ' + vendorId + ' configured');
    }
    async requestFulfillment(request, correlationId) {
        var config = this.simulationConfigs.get(request.vendorId) || this.simulationConfigs.get('default');
        this.logger.log('Vendor ' + request.vendorId + ' receiving fulfillment request for order ' + request.orderId, VendorMockService_1.name, correlationId);
        var self = this;
        await this.sleep(config.timeoutMs);
        if (config.forcedResponse) {
            return this.generateResponse(config.forcedResponse);
        }
        if (Math.random() < 0.05) {
            return { success: false, message: 'Request timeout', responseType: vendor_mock_dto_1.VendorResponseType.TIMEOUT };
        }
        if (Math.random() < config.successRate) {
            if (Math.random() < 0.02) {
                return { success: true, vendorReference: this.generateVendorReference(), message: 'Duplicate confirmation', responseType: vendor_mock_dto_1.VendorResponseType.DUPLICATE };
            }
            return this.generateResponse(vendor_mock_dto_1.VendorResponseType.SUCCESS);
        }
        return this.generateResponse(vendor_mock_dto_1.VendorResponseType.FAILURE);
    }
    async queryFulfillmentStatus(vendorId, vendorReference, correlationId) {
        this.logger.log('Querying status for vendor reference ' + vendorReference, VendorMockService_1.name, correlationId);
        await this.sleep(100);
        if (Math.random() < 0.95) {
            return { success: true, vendorReference: vendorReference, responseType: vendor_mock_dto_1.VendorResponseType.SUCCESS };
        }
        return { success: false, message: 'Status unknown', responseType: vendor_mock_dto_1.VendorResponseType.TIMEOUT };
    }
    generateResponse(type) {
        switch (type) {
            case vendor_mock_dto_1.VendorResponseType.SUCCESS:
                return { success: true, vendorReference: this.generateVendorReference(), responseType: vendor_mock_dto_1.VendorResponseType.SUCCESS };
            case vendor_mock_dto_1.VendorResponseType.FAILURE:
                return { success: false, message: 'Vendor rejected the fulfillment request', responseType: vendor_mock_dto_1.VendorResponseType.FAILURE };
            case vendor_mock_dto_1.VendorResponseType.TIMEOUT:
                return { success: false, message: 'Request timed out', responseType: vendor_mock_dto_1.VendorResponseType.TIMEOUT };
            case vendor_mock_dto_1.VendorResponseType.DUPLICATE:
                return { success: true, vendorReference: this.generateVendorReference(), message: 'Already processed', responseType: vendor_mock_dto_1.VendorResponseType.DUPLICATE };
        }
    }
    generateVendorReference() {
        return 'VND-' + (0, uuid_1.v4)().substring(0, 8).toUpperCase();
    }
    sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }
};
exports.VendorMockService = VendorMockService;
exports.VendorMockService = VendorMockService = VendorMockService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], VendorMockService);
//# sourceMappingURL=vendor-mock.service.js.map