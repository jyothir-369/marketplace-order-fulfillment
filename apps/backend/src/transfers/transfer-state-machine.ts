export enum TransferState {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  SUCCEEDED = 'SUCCEEDED',
  RETRYABLE_FAILURE = 'RETRYABLE_FAILURE',
  PERMANENT_FAILURE = 'PERMANENT_FAILURE',
  RECONCILIATION_REQUIRED = 'RECONCILIATION_REQUIRED',
}

export const STATE_TRANSITIONS: Record<string, string[]> = {
  [TransferState.PENDING]: [TransferState.PROCESSING, TransferState.PENDING],
  [TransferState.PROCESSING]: [
    TransferState.RETRYABLE_FAILURE,
    TransferState.PENDING,
    TransferState.RECONCILIATION_REQUIRED,
  ],
  [TransferState.RETRYABLE_FAILURE]: [
    TransferState.PROCESSING,
    TransferState.RECONCILIATION_REQUIRED,
  ],
  [TransferState.RECONCILIATION_REQUIRED]: [
    TransferState.PROCESSING,
    TransferState.RETRYABLE_FAILURE,
    TransferState.PENDING,
  ],
  [TransferState.SUBMITTED]: [
    TransferState.ACCEPTED,
    TransferState.RETRYABLE_FAILURE,
    TransferState.RECONCILIATION_REQUIRED,
  ],
  [TransferState.ACCEPTED]: [
    TransferState.SUCCEEDED,
    TransferState.RETRYABLE_FAILURE,
    TransferState.RECONCILIATION_REQUIRED,
  ],
  [TransferState.SUCCEEDED]: [TransferState.SUCCEEDED], // terminal
  [TransferState.PERMANENT_FAILURE]: [TransferState.PERMANENT_FAILURE], // terminal
};

export function isValidTransition(from: string, to: string): boolean {
  return (STATE_TRANSITIONS[from] || []).includes(to);
}
