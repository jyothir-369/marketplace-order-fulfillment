import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FulfillmentService } from './fulfillment.service';
import { VendorSyncJob, SyncJobStatus } from '../common/entities/vendor-sync-job.entity';
import { VendorSyncJobData, VENDOR_SYNC_QUEUE } from './vendor-sync.processor';
import { VendorQueueService } from './vendor-queue.service';
import { ReconciliationResultDto } from './dto/fulfillment.dto';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/entities/user.entity';

@Controller('fulfillment')
export class FulfillmentController {
  constructor(
    private readonly fulfillmentService: FulfillmentService,
    private readonly vendorQueueService: VendorQueueService,
    @InjectQueue(VENDOR_SYNC_QUEUE) private readonly syncQueue: Queue<VendorSyncJobData>,
  ) {}

  @Post('sync/:orderLineItemId')
  async enqueueSyncJob(
    @Param('orderLineItemId', ParseUUIDPipe) orderLineItemId: string,
    @Body() body: { orderId: string; vendorId: string },
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string; jobId: string; vendorId: string; queueName: string }> {
    var syncJob = await this.fulfillmentService.createSyncJob({
      orderLineItemId: orderLineItemId,
      orderId: body.orderId,
      vendorId: body.vendorId,
      correlationId: correlationId,
    });

    var jobData: VendorSyncJobData = {
      jobId: syncJob.id,
      orderLineItemId: orderLineItemId,
      vendorId: body.vendorId,
      correlationId: correlationId,
    };

    await this.vendorQueueService.addJobToVendorQueue(body.vendorId, jobData);
    
    var queueName = this.vendorQueueService.getQueueName(body.vendorId);

    return {
      message: 'Sync job enqueued to vendor-specific queue',
      jobId: syncJob.id,
      vendorId: body.vendorId,
      queueName: queueName,
    };
  }

  @Post('sync/:orderLineItemId/legacy')
  async enqueueSyncJobLegacy(
    @Param('orderLineItemId', ParseUUIDPipe) orderLineItemId: string,
    @Body() body: { orderId: string; vendorId: string },
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string; jobId: string; queueName: string }> {
    var syncJob = await this.fulfillmentService.createSyncJob({
      orderLineItemId: orderLineItemId,
      orderId: body.orderId,
      vendorId: body.vendorId,
      correlationId: correlationId,
    });

    var jobData: VendorSyncJobData = {
      jobId: syncJob.id,
      orderLineItemId: orderLineItemId,
      vendorId: body.vendorId,
      correlationId: correlationId,
    };

    await this.syncQueue.add('vendor-sync', jobData, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 1000,
    });

    return {
      message: 'Sync job enqueued to legacy queue',
      jobId: syncJob.id,
      queueName: VENDOR_SYNC_QUEUE,
    };
  }

  // Ops/config surface — gated to authenticated vendors/admins (Phase 1 RBAC gate).
  @Post('vendor/:vendorId/configure')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.OPERATIONS)
  async configureVendor(
    @Param('vendorId') vendorId: string,
    @Body() body: { concurrency?: number },
    @CorrelationId() correlationId: string,
  ): Promise<{ message: string; vendorId: string; concurrency: number; queueName: string }> {
    await this.vendorQueueService.configureVendorConcurrency(vendorId, body.concurrency || 3);
    
    return {
      message: 'Vendor concurrency configured',
      vendorId: vendorId,
      concurrency: body.concurrency || 3,
      queueName: this.vendorQueueService.getQueueName(vendorId),
    };
  }

  @Post('reconcile')
  async runReconciliation(@Body() body: { olderThanMinutes?: number }): Promise<ReconciliationResultDto> {
    return this.fulfillmentService.reconcile(body.olderThanMinutes !== undefined ? body.olderThanMinutes : 10);
  }

  @Get('queues/stats')
  async getQueueStats(@Query('vendorId') vendorId?: string): Promise<any> {
    if (vendorId) {
      return this.vendorQueueService.getQueueStats(vendorId);
    }
    return this.vendorQueueService.getAllQueueStats();
  }

  @Get('dead-letter')
  async getDeadLetterJobs(): Promise<VendorSyncJob[]> {
    return this.fulfillmentService.getDeadLetterJobs();
  }

  @Get('ambiguous')
  async getAmbiguousJobs(): Promise<VendorSyncJob[]> {
    return this.fulfillmentService.getAmbiguousJobs();
  }
}