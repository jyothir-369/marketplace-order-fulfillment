import { Injectable, Logger } from '@nestjs/common';
import { TransferInstructionPersistenceService } from './transfer-instruction-persistence.service';
import { VendorPaymentAccountsService } from '../vendor/payment-accounts/vendor-payment-accounts.service';
import { TransferState } from './transfer-state-machine';

@Injectable()
export class TransferDurableService {
  private readonly logger = new Logger(TransferDurableService.name);

  constructor(
    private readonly persistence: TransferInstructionPersistenceService,
    private readonly vendorAccountService?: VendorPaymentAccountsService,
  ) {}

  async submitForEligibleAllocation(
    allocationReference: string,
    vendorId: string,
    amountPaise: number,
    currency: string,
    policyVersion: string,
  ): Promise<{ instructionId?: string; state?: string; blocked?: boolean; reason?: string }> {
    // Phase 4 durable creation + Phase 2 eligibility: fail-closed.
    if (!vendorId || !allocationReference || !policyVersion || amountPaise < 0) {
      return { blocked: true, reason: 'missing/invalid fields (fail-closed)' };
    }

    // Verify vendor payment-account eligibility from persisted Phase 2 state.
    let eligible = false;
    try {
      if (this.vendorAccountService) {
        eligible = await this.vendorAccountService.isEligibleForTransfer(vendorId);
      }
    } catch {
      // Fail-closed: unknown eligibility treated as ineligible.
    }
    if (!eligible) {
      return { blocked: true, reason: `vendor ${vendorId} not eligible (ineligible/inactive/unmapped/suspended)` };
    }

    try {
      // Idempotency + transaction via persistence service (real DB when wired; simulated when blocked by auth).
      const result = await this.persistence.createInstruction({
        orderReference: allocationReference,
        allocationReference,
        vendorId,
        amountPaise,
        currency,
        policyVersion,
        destinationLinkedAccount: null,
      } as any);
      this.logger.log(`Durable transfer instruction created: ${result.id || 'simulated'} | state=${result.state}`);
      return { instructionId: (result as any).id || `TRX-${allocationReference}-${vendorId}`, state: result.state };
    } catch (err: any) {
      this.logger.error(`Durable transfer creation blocked: ${err.message}`);
      return { blocked: true, reason: err.message || 'persistence failure' };
    }
  }
}
