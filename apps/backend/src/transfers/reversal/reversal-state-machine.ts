export enum ReversalState { REQUESTED='REQUESTED', SUBMITTED='SUBMITTED', CONFIRMED='CONFIRMED', FAILED='FAILED', RECONCILIATION_REQUIRED='RECONCILIATION_REQUIRED', BLOCKED_POLICY_MISSING='BLOCKED_POLICY_MISSING' }
export function isLegalReversalTransition(from: ReversalState, to: ReversalState): boolean {
  const allowed: Record<ReversalState, ReversalState[]> = {
    [ReversalState.REQUESTED]: [ReversalState.SUBMITTED, ReversalState.BLOCKED_POLICY_MISSING, ReversalState.FAILED],
    [ReversalState.SUBMITTED]: [ReversalState.CONFIRMED, ReversalState.FAILED, ReversalState.RECONCILIATION_REQUIRED],
    [ReversalState.CONFIRMED]: [ReversalState.RECONCILIATION_REQUIRED],
    [ReversalState.FAILED]: [ReversalState.RECONCILIATION_REQUIRED],
    [ReversalState.RECONCILIATION_REQUIRED]: [ReversalState.CONFIRMED],
    [ReversalState.BLOCKED_POLICY_MISSING]: [ReversalState.REQUESTED, ReversalState.FAILED],
  };
  return (allowed[from] || []).includes(to);
}
