import { isValidTransition, TransferState, STATE_TRANSITIONS } from './transfer-state-machine';

describe('Transfer state machine', () => {
  it('valid transitions include PENDING -> PROCESSING', () => {
    expect(isValidTransition(TransferState.PENDING, TransferState.PROCESSING)).toBe(true);
  });

  it('valid transition PROCESSING -> RETRYABLE_FAILURE', () => {
    expect(isValidTransition(TransferState.PROCESSING, TransferState.RETRYABLE_FAILURE)).toBe(true);
  });

  it('invalid transition SUCCEEDED -> PROCESSING blocked', () => {
    expect(isValidTransition(TransferState.SUCCEEDED, TransferState.PROCESSING)).toBe(false);
  });

  it('terminal states cannot revert', () => {
    expect(STATE_TRANSITIONS[TransferState.SUCCEEDED]).toEqual([TransferState.SUCCEEDED]);
    expect(STATE_TRANSITIONS[TransferState.PERMANENT_FAILURE]).toEqual([TransferState.PERMANENT_FAILURE]);
  });

  it('RETRYABLE_FAILURE can recover to PROCESSING', () => {
    expect(isValidTransition(TransferState.RETRYABLE_FAILURE, TransferState.PROCESSING)).toBe(true);
  });

  it('ambiguous RECONCILIATION_REQUIRED does not allow direct SUBMITTED', () => {
    expect(isValidTransition(TransferState.RECONCILIATION_REQUIRED, TransferState.SUBMITTED)).toBe(false);
  });
});
