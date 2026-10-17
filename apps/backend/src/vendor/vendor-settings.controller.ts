import { Controller, Get, Patch, Body, UseGuards, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../common/entities/vendor.entity';
import { UpdateVendorSettingsDto } from './dto/vendor-settings.dto';

@Controller('vendor/settings')
export class VendorSettingsController {
  constructor(
    @InjectRepository(Vendor) private readonly repo: Repository<Vendor>,
  ) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async get(@CurrentUser() user: AuthenticatedUser) {
    const vendor = await this.repo.findOne({ where: { id: user.vendorId || user.id } });
    if (!vendor) throw new Error('Vendor not found');
    return vendor;
  }

  @Patch()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  async patch(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateVendorSettingsDto) {
    const id = user.vendorId || user.id;
    await this.repo.update({ id }, dto);
    return this.repo.findOne({ where: { id } });
  }
}
