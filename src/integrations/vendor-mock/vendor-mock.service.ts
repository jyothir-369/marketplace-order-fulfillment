import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { VendorFulfillmentRequestDto, VendorFulfillmentResponseDto, VendorResponseType, VendorConfigDto } from './dto/vendor-mock.dto';

@Injectable()
export class VendorMockService {
  private readonly logger = new Logger(VendorMockService.name);
  private simulationConfigs = new Map();

  constructor() {
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

  async requestFulfillment(request: VendorFulfillmentRequestDto, correlationId: string): Promise<VendorFulfillmentResponseDto> {
    var config = this.simulationConfigs.get(request.vendorId) || this.simulationConfigs.get('default');

    this.logger.log('Vendor ' + request.vendorId + ' receiving fulfillment request for order ' + request.orderId, VendorMockService.name, correlationId);

    var self = this;
    await this.sleep(config.timeoutMs);

    if (config.forcedResponse) {
      return this.generateResponse(config.forcedResponse);
    }

    if (Math.random() < 0.05) {
      return { success: false, message: 'Request timeout', responseType: VendorResponseType.TIMEOUT };
    }

    if (Math.random() < config.successRate) {
      if (Math.random() < 0.02) {
        return { success: true, vendorReference: this.generateVendorReference(), message: 'Duplicate confirmation', responseType: VendorResponseType.DUPLICATE };
      }
      return this.generateResponse(VendorResponseType.SUCCESS);
    }

    return this.generateResponse(VendorResponseType.FAILURE);
  }

  async queryFulfillmentStatus(vendorId, vendorReference, correlationId): Promise<VendorFulfillmentResponseDto> {
    this.logger.log('Querying status for vendor reference ' + vendorReference, VendorMockService.name, correlationId);
    await this.sleep(100);
    if (Math.random() < 0.95) {
      return { success: true, vendorReference: vendorReference, responseType: VendorResponseType.SUCCESS };
    }
    return { success: false, message: 'Status unknown', responseType: VendorResponseType.TIMEOUT };
  }

  generateResponse(type: VendorResponseType): VendorFulfillmentResponseDto {
    switch (type) {
      case VendorResponseType.SUCCESS:
        return { success: true, vendorReference: this.generateVendorReference(), responseType: VendorResponseType.SUCCESS };
      case VendorResponseType.FAILURE:
        return { success: false, message: 'Vendor rejected the fulfillment request', responseType: VendorResponseType.FAILURE };
      case VendorResponseType.TIMEOUT:
        return { success: false, message: 'Request timed out', responseType: VendorResponseType.TIMEOUT };
      case VendorResponseType.DUPLICATE:
        return { success: true, vendorReference: this.generateVendorReference(), message: 'Already processed', responseType: VendorResponseType.DUPLICATE };
    }
  }

  generateVendorReference(): string {
    return 'VND-' + uuidv4().substring(0, 8).toUpperCase();
  }

  sleep(ms: number): Promise<void> {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }
}