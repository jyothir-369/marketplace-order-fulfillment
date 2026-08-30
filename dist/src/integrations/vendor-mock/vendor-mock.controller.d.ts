import { VendorMockService } from './vendor-mock.service';
import { VendorConfigDto } from './dto/vendor-mock.dto';
export declare class VendorMockController {
    private readonly vendorMockService;
    constructor(vendorMockService: VendorMockService);
    configureVendor(vendorId: string, config: VendorConfigDto): {
        message: string;
    };
}
