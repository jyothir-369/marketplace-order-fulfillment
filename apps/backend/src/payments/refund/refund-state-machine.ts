// Fail-closed: no financial calculations performed; only state transition validation
export enum RefundState { REQUESTED = 'REQUESTED', SUBMITTED = 'SUBMITTED', CONFIRMED = 'CONFIRMED', FAILED = 'FAILED', RECONCILIATION_REQUIRED = 'RECONCILIATION_REQUIRED', BLOCKED_POLICY_MISSING = 'BLOCKED_POLICY_MISSING' }
export function isLegalRefundTransition(from: RefundState, to: RefundState): boolean {
  // Policy-independent transition rules only (no amounts/percentages)
  const allowed: Record<RefundState, RefundState[]> = {
    [RefundState.REQUESTED]: [RefundState.SUBMITTED, RefundState.BLOCKED_POLICY_MISSING, RefundState.FAILED],
    [RefundState.SUBMITTED]: [RefundState.CONFIRMED, RefundState.FAILED, RefundState.RECONCILIATION_REQUIRED],
    [RefundState.CONFIRMED]: [RefundState.RECONCILIATION_REQUIRED],
    [RefundState.FAILED]: [RefundState.RECONCILIATION_REQUIRED],
    [RefundState.RECONCILIATION_REQUIRED]: [RefundState.CONFIRMED],
    [RefundState.BLOCKED_POLICY_MISSING]: [RefundState.REQUESTED, RefundState.FAILED],
  };
  return (allowed[from] || []).includes(to);
}
