import { Controller, Post, Body, UseGuards, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { VendorApplicationService } from './vendor-application.service';
import { SubmitApplicationDto, ReviewApplicationDto } from './dto/vendor-application.dto';

@Controller('vendor-applications')
export class VendorApplicationController {
  constructor(private readonly service: VendorApplicationService) {}

  @Post()
  @UseGuards(OptionalAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submit(@Body() dto: SubmitApplicationDto, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.submit(dto, user);
  }

  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  async findMy(@CurrentUser() user: any) {
    return this.service.findMy(user.id);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listPending() {
    return this.service.findPending();
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @CurrentUser() user: any) {
    return this.service.review(id, { ...dto, decision: 'approve' }, user);
  }

  @Post(':id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reject(@Param('id') id: string, @Body() dto: ReviewApplicationDto, @CurrentUser() user: any) {
    return this.service.review(id, { ...dto, decision: 'reject' }, user);
  }
}
