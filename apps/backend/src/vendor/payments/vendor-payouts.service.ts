import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorPaymentAllocation } from '../../common/entities/vendor-payment-allocation.entity';
import { VendorPaymentAccount } from '../../common/entities/vendor-payment-account.entity';
import { PaymentTransfer } from '../../common/entities/payment-transfer.entity';

@Injectable()
export class VendorPayoutsService {
  constructor(
    @InjectRepository(VendorPaymentAllocation) private allocRepo: Repository<VendorPaymentAllocation>,
    @InjectRepository(VendorPaymentAccount) private acctRepo: Repository<VendorPaymentAccount>,
    @InjectRepository(PaymentTransfer) private transRepo: Repository<PaymentTransfer>,
  ) {}

  async getAllocations(vendorId: string): Promise<{ allocations: any[]; totalPaise: number; commissionPaise: number; message: string }> {
    const allocations = await this.allocRepo.find({
      where: { vendorId },
      order: { createdAt: 'DESC' },
    });
    const totalPaise = allocations.reduce((s, a) => s + (a.amountPaise || 0), 0);
    const totalCommission = allocations.reduce((s, a) => s + (a.commissionPaise || 0), 0);
    return {
      allocations: allocations.map(a => ({
        id: a.id,
        orderReference: a.orderReference,
        amountPaise: a.amountPaise,
        commissionPaise: a.commissionPaise,
        currency: a.currency,
        rulesVersion: a.rulesVersion,
        createdAt: a.createdAt,
      })),
      totalPaise,
      commissionPaise: totalCommission,
      message: allocations.length ? 'Real persisted allocations' : 'No allocations yet — allocation creation requires captured payment + approved §9 policy.',
    };
  }

  async getAccountStatus(vendorId: string): Promise<{ onboardingState: string | null; linkedAccountId: string | null; eligible: boolean; message: string }> {
    const a = await this.acctRepo.findOne({ where: { vendorId } });
    if (!a) return { onboardingState: null, linkedAccountId: null, eligible: false, message: 'No linked payment account — onboarding required before payouts (fail-closed).' };
    const eligible = a.onboardingState === 'ACTIVE' && !!a.linkedAccountId;
    return {
      onboardingState: a.onboardingState,
      linkedAccountId: a.linkedAccountId,
      eligible,
      message: eligible ? 'Eligible for transfer' : `Not eligible: state=${a.onboardingState} linked=${!!a.linkedAccountId}`,
    };
  }

  async getTransfers(vendorId: string): Promise<{ transfers: any[]; message: string }> {
    const transfers = await this.transRepo.find({
      where: { vendorId },
      order: { createdAt: 'DESC' },
    });
    return {
      transfers: transfers.map(t => ({
        id: t.id,
        orderReference: t.orderReference || '—',
        amountPaise: t.amountPaise,
        state: t.state || 'UNKNOWN',
        providerTransferId: t.providerTransferId || '—',
        attempts: t.attempts || 0,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      message: transfers.length ? 'Real persisted transfer records' : 'No transfers — transfer creation blocked until allocation + eligible account + provider sandbox verification.',
    };
  }
}
