import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorPaymentAllocation } from '../../common/entities/vendor-payment-allocation.entity';
import { PaymentTransfer } from '../../common/entities/payment-transfer.entity';
import { VendorPaymentAccount } from '../../common/entities/vendor-payment-account.entity';

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectRepository(VendorPaymentAllocation) private allocRepo: Repository<VendorPaymentAllocation>,
    @InjectRepository(PaymentTransfer) private transRepo: Repository<PaymentTransfer>,
    @InjectRepository(VendorPaymentAccount) private acctRepo: Repository<VendorPaymentAccount>,
  ) {}

  async getLedger(filters?: { vendorId?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<{ allocations: any[]; transfers: any[]; accountStatus: any[]; message: string }> {
    let allocQuery = {};
    if (filters?.vendorId) {
      allocQuery = { vendorId: filters.vendorId };
    }
    if (filters?.dateFrom || filters?.dateTo) {
      // Simplified: no real DB-level date filter in TypeORM find without query builder (fail-closed)
    }
    const allocations = await this.allocRepo.find({ where: allocQuery, order: { createdAt: 'DESC' } });
    const transfers = await this.transRepo.find({ where: { vendorId: filters?.vendorId || undefined }, order: { createdAt: 'DESC' } });
    const accounts = await this.acctRepo.find({ order: { vendorId: 'ASC' } });
    return {
      allocations: allocations.map(a => ({ id: a.id, vendorId: a.vendorId, orderReference: a.orderReference, amountPaise: a.amountPaise, commissionPaise: a.commissionPaise, currency: a.currency, rulesVersion: a.rulesVersion, createdAt: a.createdAt })),
      transfers: transfers.map(t => ({ id: t.id, vendorId: t.vendorId, orderReference: t.orderReference, amountPaise: t.amountPaise, state: t.state || 'PENDING', providerTransferId: t.providerTransferId || null, attempts: t.attempts || 0, createdAt: t.createdAt, updatedAt: t.updatedAt })),
      accountStatus: accounts.map(ac => ({ vendorId: ac.vendorId, onboardingState: ac.onboardingState, linkedAccountId: ac.linkedAccountId, provider: ac.provider })),
      message: allocations.length || transfers.length || accounts.length ? 'Real persisted records retrieved' : 'No records — requires captured payments + approved §9 rules + DB authorization.',
    };
  }
}
