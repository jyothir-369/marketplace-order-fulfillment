import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { AdminPromotionService } from './admin-promotion.service';

@Controller('admin/promotions')
export class AdminPromotionController {
  constructor(private readonly svc: AdminPromotionService) {}

  @Patch(':id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS)
  async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.approve(id, user.id);
  }

  @Patch(':id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATIONS)
  async reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.reject(id, user.id);
  }
}
