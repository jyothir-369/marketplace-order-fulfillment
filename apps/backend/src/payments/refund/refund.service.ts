import { Injectable, Logger } from '@nestjs/common';
import { RefundState } from './refund-state-machine';

@Injectable()
export class RefundService {
  private readonly policyRequiredRules = ['commission_model', 'refund_allocation', 'fee_bearer', 'tax_shipping_allocation', 'rounding', 'discount_funding', 'commission_basis'];
  validatePolicyPresent(policyConfig: any): boolean {
    return !!policyConfig && typeof policyConfig.commission_model !== 'undefined';
  }
  submitRefund(ref: string, amountPaise: number, policyConfig?: any): { state: RefundState; blocked?: boolean; reason?: string } {
    if (!ref || !ref.trim()) return { state: RefundState.BLOCKED_POLICY_MISSING, blocked: true, reason: 'missing-reference' };
    if (amountPaise < 0) return { state: RefundState.BLOCKED_POLICY_MISSING, blocked: true, reason: 'negative-amount' };
    if (!policyConfig || !this.validatePolicyPresent(policyConfig)) {
      return { state: RefundState.BLOCKED_POLICY_MISSING, blocked: true, reason: 'policy-missing (§4 rules 1-7 UNDECIDED)' };
    }
    return { state: RefundState.SUBMITTED, blocked: false };
  }
}
