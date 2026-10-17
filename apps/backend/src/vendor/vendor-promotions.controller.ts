import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { VendorPromotionsService } from './vendor-promotions.service';

@Controller('vendor/promotions')
export class VendorPromotionsController {
  constructor(private readonly svc: VendorPromotionsService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { promotions: await this.svc.findByVendor(user.vendorId || user.id) };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return await this.svc.create(user.vendorId || user.id, body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return await this.svc.update(id, user.vendorId || user.id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return await this.svc.remove(id, user.vendorId || user.id);
  }
}
