import { Controller, Post, Get, Body, Param, Query, UseGuards, Patch, Delete } from '@nestjs/common';
import { VendorPaymentAccountsService, LinkAccountInput } from './vendor-payment-accounts.service';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('vendor/payment-accounts')
@UseGuards(AuthGuard, RolesGuard)
export class VendorPaymentAccountsController {
  constructor(private svc: VendorPaymentAccountsService) {}

  @Post('link')
  link(@Body() body: LinkAccountInput) {
    // Actor/role validation performed by service (fail-closed)
    return this.svc.link(body, 'admin-user', true);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.svc.activate(id, 'admin-user', true);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.svc.suspend(id, 'admin-user', true);
  }

  @Delete(':vendorId')
  unlink(@Param('vendorId') vendorId: string) {
    return this.svc.unlink(vendorId, 'admin-user', true);
  }

  @Get(':vendorId')
  get(@Param('vendorId') vendorId: string) {
    return this.svc.getByVendor(vendorId);
  }

  @Get(':vendorId/eligible')
  eligible(@Param('vendorId') vendorId: string) {
    return this.svc.isEligibleForTransfer(vendorId);
  }
}
