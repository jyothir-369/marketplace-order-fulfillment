import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorPaymentAllocation } from '../../common/entities/vendor-payment-allocation.entity';
import { calculateVendorAllocation, AllocationResult, AllocationInput } from './allocation-engine.service';
import { CommissionPolicy, validatePolicy } from './commission-policy.interface';

@Injectable()
export class AllocationService {
  constructor(
    @InjectRepository(VendorPaymentAllocation)
    private readonly repo: Repository<VendorPaymentAllocation>,
  ) {}

  async createAllocation(
    input: AllocationInput,
    policy: CommissionPolicy,
  ): Promise<AllocationResult> {
    // Fail-closed guard: unverified vendor accounts must not proceed.
    if (input.vendorAccountState && input.vendorAccountState !== 'ACTIVE') {
      throw new Error(`Vendor ${input.vendorId} not eligible: state=${input.vendorAccountState}`);
    }
    if (input.linkedAccountStatus && input.linkedAccountStatus !== 'ELIGIBLE' && input.linkedAccountStatus !== 'ACTIVE') {
      throw new Error(`Linked account not eligible: status=${input.linkedAccountStatus}`);
    }

    const validated = validatePolicy(policy, input.rulesVersion);
    const result = calculateVendorAllocation(input, validated);

    // Persist allocation snapshot (immutable); do not label as transferred/paid.
    const entity = this.repo.create({
      orderReference: result.orderReference,
      vendorId: result.vendorId,
      amountPaise: result.allocationPaise,
      commissionPaise: result.breakdown.commissionPaise,
      currency: result.currency,
      rulesVersion: result.rulesVersion,
    } as Partial<VendorPaymentAllocation>);
    await this.repo.save(entity);
    return result;
  }
}
