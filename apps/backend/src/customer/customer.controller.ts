import { Controller, Get, Patch, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CustomerService, UpdateProfileDto } from './customer.service';
import { UserRole } from '../common/entities/user.entity';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('customer')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  async profile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.service.profile(user.id);
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName || null,
      bio: profile.bio || null,
      role: profile.role,
      vendorId: profile.vendorId || null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Body() body: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if ((body as any).role) throw new ForbiddenException('Role cannot be changed');
    const updated = await this.service.update(user.id, body);
    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName || null,
      bio: updated.bio || null,
      role: updated.role,
      vendorId: updated.vendorId || null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
