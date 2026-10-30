import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorPaymentAllocation } from '../../common/entities/vendor-payment-allocation.entity';
import {
  calculateVendorAllocation,
  AllocationResult,
  AllocationInput,
} from './allocation-engine.service';
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
    // Fail closed: an explicitly known ineligible account must never receive an allocation.
    if (input.vendorAccountState !== 'ACTIVE') {
      throw new Error(
        `Vendor ${input.vendorId} not eligible: state=${input.vendorAccountState}`,
      );
    }

    if (
      input.linkedAccountStatus &&
      input.linkedAccountStatus !== 'ELIGIBLE' &&
      input.linkedAccountStatus !== 'ACTIVE'
    ) {
      throw new Error(
        `Linked account not eligible: status=${input.linkedAccountStatus}`,
      );
    }

    const validated = validatePolicy(policy, input.rulesVersion);
    const result = calculateVendorAllocation(input, validated);
    const expected = {
      orderReference: result.orderReference,
      vendorId: result.vendorId,
      amountPaise: result.allocationPaise,
      commissionPaise: result.breakdown.commissionPaise,
      currency: result.currency,
      rulesVersion: result.rulesVersion,
    };

    const matchesExisting = (existing: VendorPaymentAllocation): boolean =>
      existing.orderReference === expected.orderReference &&
      existing.vendorId === expected.vendorId &&
      existing.amountPaise === expected.amountPaise &&
      existing.commissionPaise === expected.commissionPaise &&
      existing.currency === expected.currency &&
      existing.rulesVersion === expected.rulesVersion;

    // Idempotent retry: an existing immutable snapshot may be reused only
    // when the complete financial result and policy version match.
    const existing = await this.repo.findOne({
      where: {
        orderReference: expected.orderReference,
        vendorId: expected.vendorId,
      },
    });

    if (existing) {
      if (!matchesExisting(existing)) {
        throw new Error(
          `Allocation conflict for order ${expected.orderReference}, vendor ${expected.vendorId}: existing snapshot differs from recalculated result`,
        );
      }
      return result;
    }

    const entity = this.repo.create(expected as Partial<VendorPaymentAllocation>);

    try {
      await this.repo.save(entity);
      return result;
    } catch (saveError) {
      // A concurrent request may have inserted the unique order/vendor row
      // after our initial lookup. Re-read and accept only an identical result.
      const concurrent = await this.repo.findOne({
        where: {
          orderReference: expected.orderReference,
          vendorId: expected.vendorId,
        },
      });

      if (concurrent) {
        if (matchesExisting(concurrent)) {
          return result;
        }

        throw new Error(
          `Concurrent allocation conflict for order ${expected.orderReference}, vendor ${expected.vendorId}: existing snapshot differs from recalculated result`,
        );
      }

      throw saveError;
    }
  }
}