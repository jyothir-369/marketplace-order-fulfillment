import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferInstruction } from './transfer-instruction.entity';
import { TransferInstructionPersistenceService } from './transfer-instruction-persistence.service';
import { TransferOutboxDispatcherService } from './transfer-outbox-dispatcher.service';
import { TransferOrchestrationService } from './transfer-orchestration.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransferInstruction])],
  providers: [
    TransferInstructionPersistenceService,
    TransferOutboxDispatcherService,
    TransferOrchestrationService,
  ],
  exports: [
    TransferInstructionPersistenceService,
    TransferOrchestrationService,
  ],
})
export class TransferModule {}
