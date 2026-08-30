import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FulfillmentService } from './fulfillment.service';

@Injectable()
export class ReconciliationScheduler {
  private readonly logger = new Logger(ReconciliationScheduler.name);
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleReconciliation(): Promise<void> {
    this.logger.log('Starting scheduled reconciliation');
    try {
      var result = await this.fulfillmentService.reconcile(10);
      this.logger.log('Reconciliation complete: processed=' + result.processed + ', resolved=' + result.resolved + ', errors=' + result.errors.length, ReconciliationScheduler.name);
    } catch (error) {
      var errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Reconciliation failed: ' + errorMessage, ReconciliationScheduler.name);
    }
  }
}