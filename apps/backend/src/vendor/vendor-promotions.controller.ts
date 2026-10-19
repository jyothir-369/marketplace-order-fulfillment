import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { VendorPromotionsService } from './vendor-promotions.service';
import { VendorPromotionDto, VendorPromotionUpdateDto } from './dto/vendor-promotion.dto';

@Controller('vendor/promotions')
export class VendorPromotionsController {
  constructor(private readonly svc: VendorPromotionsService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async list(@CurrentUser() user: AuthenticatedUser) {
    const vendorId = this.verifyVendorId(user);
    return { promotions: await this.svc.findByVendor(vendorId) };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: VendorPromotionDto) {
    const vendorId = this.verifyVendorId(user);
    return await this.svc.create(vendorId, body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: VendorPromotionUpdateDto) {
    const vendorId = this.verifyVendorId(user);
    return await this.svc.update(id, vendorId, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const vendorId = this.verifyVendorId(user);
    return await this.svc.remove(id, vendorId);
  }

  private verifyVendorId(user: AuthenticatedUser): string {
    if (user.role === UserRole.VENDOR) {
      if (!user.vendorId || String(user.vendorId).trim() === '') {
        throw new ForbiddenException('Vendor identity required');
      }
      return String(user.vendorId).trim();
    }
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin vendor context not verified');
    }
    throw new ForbiddenException('Verified vendor context required');
  }
}