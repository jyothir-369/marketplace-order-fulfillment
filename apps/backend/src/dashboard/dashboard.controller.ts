import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { OverviewResponseDto } from './dto/overview-response.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(
    @Query() query: OverviewQueryDto,
    @Request() req: any,
  ): Promise<OverviewResponseDto> {
    // Every query scoped by tenant_id from the authenticated request (JWT);
    // client-provided tenant_id is IGNORED.
    const tenantId = req.user?.tenantId ?? req.user?.sub ?? 'unknown';
    return this.dashboardService.getOverview(tenantId, query.range ?? 'this_month') as Promise<OverviewResponseDto>;
  }
}
