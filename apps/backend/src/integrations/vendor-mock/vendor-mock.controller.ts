import { Controller, Post, Body, Param } from '@nestjs/common';
import { VendorMockService } from './vendor-mock.service';
import { VendorConfigDto } from './dto/vendor-mock.dto';

@Controller('integrations/vendor-mock')
export class VendorMockController {
  constructor(private readonly vendorMockService: VendorMockService) {}

  @Post('config/:vendorId')
  configureVendor(@Param('vendorId') vendorId: string, @Body() config: VendorConfigDto) {
    this.vendorMockService.configureVendor(vendorId, config);
    return { message: 'Vendor ' + vendorId + ' configured' };
  }
}