import { TransferInstructionPersistenceService } from './transfer-instruction-persistence.service';
import { TransferState } from './transfer-state-machine';

export class TransferWorkerService {
  // Asynchronous claim: reload authoritative DB state; never trust queue payload alone.
  async processJob(instructionId: string, persistence: TransferInstructionPersistenceService): Promise<void> {
    const claimed = await persistence.claimForProcessing(instructionId);
    if (!claimed) {
      throw new Error(`Worker claim failed (already claimed or invalid transition) for ${instructionId}`);
    }
    // Real provider submission disabled; adapter returns submitted=false.
    await persistence.recordAttempt(instructionId, TransferState.RETRYABLE_FAILURE);
  }
}
