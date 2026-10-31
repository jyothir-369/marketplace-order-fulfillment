import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/entities/user.entity';
import { AdminPaymentsService } from './admin-payments.service';

@Controller('admin/payments')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATIONS)
export class AdminPaymentsController {
  constructor(private readonly svc: AdminPaymentsService) {}

  @Get('ledger')
  async getLedger(
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<any> {
    return this.svc.getLedger({ vendorId, status, dateFrom, dateTo });
  }
}
