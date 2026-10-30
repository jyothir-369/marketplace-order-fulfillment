import { Injectable, Logger } from '@nestjs/common';
import { TransferInstructionPersistenceService } from './transfer-instruction-persistence.service';
import { TransferState } from './transfer-state-machine';

@Injectable()
export class TransferOutboxDispatcherService {
  private readonly logger = new Logger(TransferOutboxDispatcherService.name);

  constructor(private readonly persistence: TransferInstructionPersistenceService) {}

  // Only dispatch committed outbox events; DB remains authoritative.
  async dispatchPendingInstructions(): Promise<number> {
    const count = 0; // Simulated: SELECT * FROM outbox WHERE dispatched=false.
    this.logger.log(`Dispatched ${count} outbox events (simulated)`);
    return count;
  }

  async recoverFromCrash(): Promise<void> {
    this.logger.log('Recovering stale claims (simulated recovery)');
  }
}
