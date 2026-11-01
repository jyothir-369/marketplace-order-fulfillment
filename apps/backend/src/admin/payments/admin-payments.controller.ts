import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/entities/user.entity';
import { AdminPaymentsService } from './admin-payments.service';
import { Refund } from '../../common/entities/refund.entity';
import { Dispute } from '../../common/entities/dispute.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('admin/payments')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATIONS)
export class AdminPaymentsController {
  constructor(
    private readonly svc: AdminPaymentsService,
    @InjectRepository(Refund) private refundRepo: Repository<Refund>,
    @InjectRepository(Dispute) private disputeRepo: Repository<Dispute>,
  ) {}

  @Get('ledger')
  async getLedger(
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<any> {
    return this.svc.getLedger({ vendorId, status, dateFrom, dateTo });
  }

  @Get('refunds')
  async getRefunds(@Query('page') pageStr?: string, @Query('limit') limitStr?: string): Promise<any> {
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    const [items, total] = await this.refundRepo.findAndCount({
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });
    return { items: items.map(r => ({ id: r.id, refundReference: r.refundReference, orderReference: r.orderReference, amountPaise: r.amountPaise, currency: r.currency, state: r.state, providerRefundId: r.providerRefundId, reason: r.reason, createdAt: r.createdAt, updatedAt: r.updatedAt })), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  @Get('disputes')
  async getDisputes(@Query('page') pageStr?: string, @Query('limit') limitStr?: string, @Query('status') status?: string): Promise<any> {
    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    const where: any = {};
    if (status) where.state = status;
    const [items, total] = await this.disputeRepo.findAndCount({
      where,
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });
    return { items: items.map(d => ({ id: d.id, providerDisputeId: d.providerDisputeId, orderReference: d.orderReference, state: d.state, amountPaise: d.amountPaise, currency: d.currency, reason: d.reason, dueAt: d.dueAt, createdAt: d.createdAt, updatedAt: d.updatedAt })), total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
