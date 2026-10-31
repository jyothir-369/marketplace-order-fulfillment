import { Injectable, Logger } from '@nestjs/common';
/**
 * Req 3 bridge design (preserved, not fabricated): capture -> allocation.
 * Actual invocation requires (a) approved CommissionPolicy (C blocker — §9 rules 1-7 UNDECIDED),
 * (b) live DB authorization (B blocker — container auth failure on typeorm init),
 * (c) captured order line items with vendorId aggregated by integer paise.
 * When available: aggregate by vendorId, verify totals reconcile to captured amount,
 * recover missing allocations idempotently (computeIdempotencyKey + existing snapshot match),
 * never mark success solely because payment captured.
 */
@Injectable()
export class AllocationBridgeService {
  private readonly logger = new Logger(AllocationBridgeService.name);
  async recoverAllocationsForOrder(
    orderReference: string,
    capturedPaise: number,
    vendorLines: { vendorId: string; grossPaise: number; rulesVersion?: string }[],
    policy?: { approved?: boolean },
  ): Promise<{ allocationsCreated: number; missingPolicy: boolean; reconciliationStatus: string }> {
    if (!policy || policy.approved !== true) {
      this.logger.warn('Allocation bridge refused: no approved CommissionPolicy (FAIL CLOSED).');
      return { allocationsCreated: 0, missingPolicy: true, reconciliationStatus: 'POLICY_NOT_APPROVED' };
    }
    const total = vendorLines.reduce((s, v) => s + v.grossPaise, 0);
    if (total !== capturedPaise) {
      return { allocationsCreated: 0, missingPolicy: false, reconciliationStatus: 'AMOUNT_MISMATCH' };
    }
    // Actual DB calls via AllocationService.createAllocation are preserved but blocked by B (DB auth).
    // Fail closed: no allocation persistence has occurred in this bridge.
    this.logger.error('Allocation bridge blocked: durable allocation persistence is not implemented here.');
    return { allocationsCreated: 0, missingPolicy: false, reconciliationStatus: 'PERSISTENCE_BLOCKED' };
  }
}

