import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { VendorPaymentAllocation } from '../../common/entities/vendor-payment-allocation.entity';
import {
  calculateVendorAllocation,
  AllocationResult,
  AllocationInput,
} from './allocation-engine.service';
import { CommissionPolicy, validatePolicy } from './commission-policy.interface';
import { AllocationConflictError, ConcurrentAllocationError } from './allocation-conflict.error';

/**
 * Stage 3 — Durable Allocation Persistence:
 * - Transactional insert of an immutable allocation snapshot.
 * - Pessimistic write lock on the order/vendor pair to reject concurrent retries.
 * - Retry on duplicate-key race, but reject conflicting retries instead of
 *   returning inconsistent allocations.
 * - Snapshot preservation and exact cents columns.
 */
@Injectable()
export class DurableAllocationService {
  private readonly logger = new Logger(DurableAllocationService.name);

  constructor(
    @InjectRepository(VendorPaymentAllocation)
    private readonly repo: Repository<VendorPaymentAllocation>,
    private readonly dataSource: DataSource,
  ) {}

  async createAllocationDurable(
    input: AllocationInput,
    policy: CommissionPolicy,
  ): Promise<AllocationResult> {
    // Engine is responsible for fail-closed math + eligibility guards;
    // this service only mirrors that onto durable storage.
    const validated = validatePolicy(policy, input.rulesVersion);
    const result = calculateVendorAllocation(input, validated);

    return this.dataSource.transaction(async (tx) => {
      const txRepo = tx.getRepository(VendorPaymentAllocation);

      // Acquire pessimistic write lock on the order/vendor key to serialize
      // concurrent allocators. Reject concurrent inserts; never return inconsistent data.
      const existing = await txRepo
        .createQueryBuilder('a')
        .setLock('pessimistic_write')
        .where('a.orderReference = :orderRef', { orderRef: result.orderReference })
        .andWhere('a.vendorId = :vendorId', { vendorId: result.vendorId })
        .getOne();

      if (existing) {
        if (!this.matches(existing, result)) {
          throw new AllocationConflictError(
            result.orderReference,
            result.vendorId,
            'Existing snapshot differs from recalculated result',
          );
        }
        // Idempotent accept: identical result, safe to reuse.
        return result;
      }

      const entity = txRepo.create({
        orderReference: result.orderReference,
        vendorId: result.vendorId,
        amountCents: result.allocationCents,
        commissionCents: result.breakdown.commissionCents,
        currency: result.currency,
        rulesVersion: result.rulesVersion,
        grossLineCents: result.grossLineCents,
        reconciliationStatus: result.reconciliationStatus,
        snapshot: result.snapshot,
        idempotencyKey: result.idempotencyKey,
      });

      try {
        await txRepo.save(entity);
      } catch (err: any) {
        // Duplicate-key race under transaction — re-read within the same tx.
        const concurrent = await txRepo.findOne({
          where: { orderReference: result.orderReference, vendorId: result.vendorId },
        });
        if (concurrent) {
          if (!this.matches(concurrent, result)) {
            throw new ConcurrentAllocationError(
              result.orderReference,
              result.vendorId,
              'Concurrent allocation conflict: existing result differs',
            );
          }
          return result; // still idempotent
        }
        this.logger.warn(`Persistence save failed for order=${result.orderReference}; rethrowing`);
        throw err;
      }
      return result;
    });
  }

  private matches(existing: VendorPaymentAllocation, r: AllocationResult): boolean {
    return (
      existing.amountCents === r.allocationCents &&
      existing.commissionCents === r.breakdown.commissionCents &&
      existing.currency === r.currency &&
      existing.rulesVersion === r.rulesVersion &&
      existing.reconciliationStatus === r.reconciliationStatus &&
      existing.snapshot === r.snapshot &&
      existing.idempotencyKey === r.idempotencyKey
    );
  }
}
