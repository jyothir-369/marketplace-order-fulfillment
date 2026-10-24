import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';
import { AdminService } from './admin.service';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';

@Controller('admin/customers')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATIONS)
export class AdminCustomersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  async listCustomers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @CorrelationId() correlationId?: string,
  ) {
    const result = await this.adminService.getOrders(
      { status: 'all', limit: limit ? Math.min(parseInt(limit, 10), 50) : 50, offset: offset ? parseInt(offset, 10) : 0 },
      correlationId || 'customers-query',
    );
    const map = new Map();
    for (const o of result.orders) {
      const existing = map.get(o.buyerId) || { buyerId: o.buyerId, orderCount: 0 };
      existing.orderCount += 1;
      map.set(o.buyerId, existing);
    }
    const customers = Array.from(map.values()).sort((a,b)=>b.orderCount-a.orderCount);
    return { total: customers.length, customers };
  }
}
