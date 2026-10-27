import { Injectable } from '@nestjs/common';
import { ReversalState } from './reversal-state-machine';
@Injectable()
export class ReversalService {
  submitReversal(transferInstructionId: string, policyConfig?: any): { state: ReversalState; blocked?: boolean; reason?: string } {
    if (!transferInstructionId || !transferInstructionId.trim()) return { state: ReversalState.BLOCKED_POLICY_MISSING, blocked: true, reason: 'missing-transfer-reference' };
    if (!policyConfig || !policyConfig.commission_model) return { state: ReversalState.BLOCKED_POLICY_MISSING, blocked: true, reason: 'policy-missing (§4 rules UNDECIDED)' };
    return { state: ReversalState.SUBMITTED, blocked: false }; // policy-independent; adapter submitted stays false
  }
}
