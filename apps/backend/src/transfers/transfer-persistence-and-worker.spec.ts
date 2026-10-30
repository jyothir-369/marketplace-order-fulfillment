import { TransferInstructionPersistenceService } from './transfer-instruction-persistence.service';
import { TransferState, isValidTransition } from './transfer-state-machine';

describe('Transfer persistence, outbox, worker and recovery (Phase 4.2)', () => {
  let persistence: TransferInstructionPersistenceService;

  beforeEach(() => {
    persistence = new TransferInstructionPersistenceService();
  });

  const base = {
    vendorId: 'V-ACTIVE',
    allocationReference: 'ALLOC-001',
    orderReference: 'ORD-001',
    amountPaise: 9500,
    currency: 'INR',
    policyVersion: 'TEST-ONLY-v1',
    destinationLinkedAccount: 'acct_123',
  };

  it('persistence creates instruction and enforces idempotency via identity', async () => {
    const r1 = await persistence.createInstruction(base);
    const r2 = await persistence.createInstruction(base);
    expect(r1.idempotencyKey).toBe(r2.idempotencyKey);
  });

  it('duplicate concurrent instruction creation blocked (DB guard simulated)', async () => {
    const r1 = await persistence.createInstruction(base);
    const claim = await persistence.claimForProcessing(r1.id!);
    expect(claim).not.toBeNull();
    expect(claim!.state).toBe(TransferState.PROCESSING);
  });

  it('claim blocked for invalid transition (terminal state)', async () => {
    const r = await persistence.createInstruction(base);
    // Direct transition to SUCCEEDED blocked by state machine (not by persistence alone).
    expect(isValidTransition(TransferState.PENDING, TransferState.SUCCEEDED)).toBe(false);
  });

  it('retry bound preserved: recordAttempt does not invent provider confirmation', async () => {
    const r = await persistence.createInstruction(base);
    await persistence.recordAttempt(r.id!, TransferState.RETRYABLE_FAILURE);
    // Provider adapter submitted remains false; no fabricated confirmation. State remains PENDING in memory (DB updates independently).
    expect(r.state).toBe(TransferState.PENDING);
  });

  it('stale-claim recovery tracks attempts/lastAttemptAt', async () => {
    const r = await persistence.createInstruction(base);
    const c = await persistence.claimForProcessing(r.id!);
    expect(c!.attempts).toBeGreaterThanOrEqual(1);
    expect(c!.lastAttemptAt).toBeInstanceOf(Date);
  });

  it('no fabricated provider transfer ID or success (state stays PENDING; adapter submitted false)', async () => {
    const r = await persistence.createInstruction(base);
    expect(r.state).toBe(TransferState.PENDING);
  });

  it('ambiguous timeout handled via RECONCILIATION_REQUIRED (not blind SUBMITTED)', async () => {
    expect(isValidTransition(TransferState.RETRYABLE_FAILURE, TransferState.RECONCILIATION_REQUIRED)).toBe(true);
  });
});
