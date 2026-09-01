import { Test, TestingModule } from '@nestjs/testing';
import { VendorSyncProcessor } from './vendor-sync.processor';
import { FulfillmentService } from './fulfillment.service';
import { Job } from 'bullmq';

describe('VendorSyncProcessor', () => {
  let processor: VendorSyncProcessor;
  let fulfillmentService: FulfillmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorSyncProcessor,
        { provide: FulfillmentService, useValue: { processSyncJob: jest.fn() } },
      ],
    }).compile();

    processor = module.get<VendorSyncProcessor>(VendorSyncProcessor);
    fulfillmentService = module.get<FulfillmentService>(FulfillmentService);
  });

  it('should process job correctly', async () => {
    const job = { data: { jobId: 'j1', vendorId: 'v1', orderLineItemId: 'i1', correlationId: 'c1' } } as Job;
    await processor.process(job);
    expect(fulfillmentService.processSyncJob).toHaveBeenCalledWith('j1', 'c1');
  });
});
