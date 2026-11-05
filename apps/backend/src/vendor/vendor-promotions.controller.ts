import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { VendorPromotionsService } from './vendor-promotions.service';
import { PromotionFundingApprovalDto, PromotionFundingApprovalUpdateDto } from './dto/promotion-funding-approval.dto';

@Controller('vendor/promotions')
export class VendorPromotionsController {
  constructor(private readonly svc: VendorPromotionsService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  async list(@CurrentUser() user: AuthenticatedUser) {
    const vendorId = this.verifyVendorId(user);
    return { promotions: await this.svc.findByVendor(vendorId) };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: PromotionFundingApprovalDto) {
    const vendorId = this.verifyVendorId(user);
    return await this.svc.create(vendorId, body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: PromotionFundingApprovalUpdateDto) {
    const vendorId = this.verifyVendorId(user);
    // Vendors must never approve their own promotions; only update non-approval fields.
    if (body.approvalState !== undefined && body.approvalState !== 'PENDING') {
      throw new ForbiddenException('Vendor cannot approve/reject own promotion');
    }
    return await this.svc.update(id, vendorId, body as any);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const vendorId = this.verifyVendorId(user);
    return await this.svc.remove(id, vendorId);
  }

  private verifyVendorId(user: AuthenticatedUser): string {
    if (user.role === UserRole.VENDOR) {
      if (!user.vendorId || String(user.vendorId).trim() === '') {
        throw new ForbiddenException('Verified vendor identity required');
      }
      return String(user.vendorId).trim();
    }
    // Restrict vendor-scoped endpoints to verified VENDOR identities.
    // ADMIN must not access vendor-scoped promotion endpoints.
    throw new ForbiddenException('Verified vendor context required');
  }
}