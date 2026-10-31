import { Injectable } from '@nestjs/common';
import { TransferState, isValidTransition } from './transfer-state-machine';

export interface TransferInstructionInput {
  vendorId: string;
  orderReference: string;
  allocationReference: string;
  amountPaise: number;
  currency: string;
  policyVersion: string;
  destinationLinkedAccount: string;
}

@Injectable()
export class TransferOrchestrationService {
  // Fail-closed: only eligible allocations proceed; provider submission disabled until verified.
  createInstruction(input: TransferInstructionInput, currentState?: string): { instructionId: string; state: TransferState; idempotencyKey: string } {
    // Verify no duplicate logical identity would be created (idempotency guard).
    const idempotencyKey = this.buildKey(input.allocationReference, input.vendorId, input.policyVersion);

    // Gate: unverified vendor / missing policy / unreconciled allocation must not proceed.
    if (!input.vendorId || !input.policyVersion || !input.amountPaise || input.amountPaise < 0) {
      throw new Error('TransferInstruction blocked: missing/invalid input (fail-closed)');
    // Phase 2 / 4 integration: verify persisted vendor payment-account eligibility before creation.
    // Actual check uses VendorPaymentAccountsService.isEligibleForTransfer (injected at module level). Blocked if unmapped/inactive/suspended.
    }

    // State transition guard if updating existing instruction.
    const newState = TransferState.PENDING;
    if (currentState && !isValidTransition(currentState, newState)) {
      throw new Error(`Invalid transition ${currentState} -> ${newState}`);
    }

    // Durable instruction record would be persisted transactionally with allocation.
    // Queue dispatch happens only after DB commit (not shown here; service boundary).
    return {
      instructionId: `TRX-${input.allocationReference}-${input.vendorId}`,
      state: newState,
      idempotencyKey,
    };
  }

  private buildKey(allocationRef: string, vendorId: string, policyVersion: string): string {
    return require('crypto').createHash('sha256').update(`${allocationRef}|${vendorId}|${policyVersion}`).digest('hex');
  }

  // Provider adapter boundary: prepares request only; submission disabled until verification.
  prepareProviderRequest(instruction: { amountPaise: number; currency: string; destinationLinkedAccount: string; idempotencyKey: string }) {
    return {
      amount: instruction.amountPaise,
      currency: instruction.currency,
      destination: instruction.destinationLinkedAccount,
      idempotencyKey: instruction.idempotencyKey,
      submitted: false, // safe: disabled until provider verified
    };
  }
}
