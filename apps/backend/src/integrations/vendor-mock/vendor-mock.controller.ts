import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { VendorMockService } from './vendor-mock.service';
import { VendorConfigDto } from './dto/vendor-mock.dto';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/entities/user.entity';

@Controller('integrations/vendor-mock')
export class VendorMockController {
  constructor(private readonly vendorMockService: VendorMockService) {}

  // An anonymous caller must not be able to rewire the mock vendor sim.
  @Post('config/:vendorId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.OPERATIONS)
  configureVendor(@Param('vendorId') vendorId: string, @Body() config: VendorConfigDto) {
    this.vendorMockService.configureVendor(vendorId, config);
    return { message: 'Vendor ' + vendorId + ' configured' };
  }
}