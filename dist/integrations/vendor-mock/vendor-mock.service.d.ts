import { VendorFulfillmentRequestDto, VendorFulfillmentResponseDto, VendorResponseType } from './dto/vendor-mock.dto';
export declare class VendorMockService {
    private readonly logger;
    private simulationConfigs;
    constructor();
    setDefaultConfig(): void;
    configureVendor(vendorId: any, config: any): void;
    requestFulfillment(request: VendorFulfillmentRequestDto, correlationId: string): Promise<VendorFulfillmentResponseDto>;
    queryFulfillmentStatus(vendorId: any, vendorReference: any, correlationId: any): Promise<VendorFulfillmentResponseDto>;
    generateResponse(type: VendorResponseType): VendorFulfillmentResponseDto;
    generateVendorReference(): string;
    sleep(ms: number): Promise<void>;
}
