import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorPaymentAccount } from '../../common/entities/vendor-payment-account.entity';
import { AuditLog, AuditAction, AuditEntityType } from '../../common/audit/audit-log.entity';
import { InjectRepository as AuditRepo } from '@nestjs/typeorm';

export interface LinkAccountInput {
  vendorId: string;
  linkedAccountId: string;
}

@Injectable()
export class VendorPaymentAccountsService {
  constructor(
    @InjectRepository(VendorPaymentAccount)
    private repo: Repository<VendorPaymentAccount>,
  ) {}

  private assertRecord(rec: VendorPaymentAccount) {
    if (!rec) throw new NotFoundException('Vendor payment account not found');
  }

  async link(input: LinkAccountInput, actorId: string, isAdmin: boolean): Promise<VendorPaymentAccount> {
    if (!input.vendorId || !input.linkedAccountId) throw new BadRequestException('vendorId and linkedAccountId required');
    const existing = await this.repo.findOne({ where: { vendorId: input.vendorId } });
    if (existing && existing.onboardingState === 'ACTIVE') {
      throw new ConflictException('Account already linked and active');
    }
    const record = this.repo.create({
      vendorId: input.vendorId,
      provider: 'razorpay',
      linkedAccountId: input.linkedAccountId,
      onboardingState: 'PENDING',
    });
    return this.repo.save(record);
  }

  async activate(accountId: string, actorId: string, isAdmin: boolean): Promise<VendorPaymentAccount> {
    if (!isAdmin) throw new ForbiddenException('Admin authorization required');
    const rec = await this.repo.findOne({ where: { id: accountId } });
    this.assertRecord(rec);
    if (!rec.linkedAccountId) throw new ConflictException('No linked account to activate');
    if (rec.onboardingState === 'ACTIVE') return rec;
    rec.onboardingState = 'ACTIVE';
    return this.repo.save(rec);
  }

  async suspend(accountId: string, actorId: string, isAdmin: boolean): Promise<VendorPaymentAccount> {
    if (!isAdmin) throw new ForbiddenException('Admin authorization required');
    const rec = await this.repo.findOne({ where: { id: accountId } });
    this.assertRecord(rec);
    if (rec.onboardingState === 'SUSPENDED') return rec;
    rec.onboardingState = 'SUSPENDED';
    return this.repo.save(rec);
  }

  async unlink(vendorId: string, actorId: string, isAdmin: boolean): Promise<void> {
    if (!isAdmin) throw new ForbiddenException('Admin authorization required');
    const result = await this.repo.delete({ vendorId });
    if (result.affected === 0) throw new NotFoundException('Account not found');
  }

  async getByVendor(vendorId: string): Promise<VendorPaymentAccount | null> {
    return this.repo.findOne({ where: { vendorId } });
  }

  async isEligibleForTransfer(vendorId: string): Promise<boolean> {
    const a = await this.getByVendor(vendorId);
    if (!a) return false;
    return a.onboardingState === 'ACTIVE' && !!a.linkedAccountId;
  }

  async getStatus(vendorId: string): Promise<{ onboardingState: string; provider: string; linkedAccountId: string | null }> {
    const a = await this.getByVendor(vendorId);
    if (!a) throw new NotFoundException('Account not found');
    return {
      onboardingState: a.onboardingState,
      provider: a.provider,
      linkedAccountId: a.linkedAccountId,
    };
  }
}
