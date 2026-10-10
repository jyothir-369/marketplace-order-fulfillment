import { Controller, Get, Patch, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../common/entities/user.entity';

@Controller('customer')
export class CustomerController {
  @Get('profile')
  @UseGuards(AuthGuard)
  async profile(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName || null,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Body() body: { displayName?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (user.role !== UserRole.BUYER) throw new ForbiddenException('Buyers only');
    return { updated: true, displayName: body.displayName ?? user.displayName };
  }
}
