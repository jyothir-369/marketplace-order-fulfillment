"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const vendor_sync_processor_1 = require("./vendor-sync.processor");
const fulfillment_service_1 = require("./fulfillment.service");
describe('VendorSyncProcessor', () => {
    let processor;
    let fulfillmentService;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                vendor_sync_processor_1.VendorSyncProcessor,
                { provide: fulfillment_service_1.FulfillmentService, useValue: { processSyncJob: jest.fn() } },
            ],
        }).compile();
        processor = module.get(vendor_sync_processor_1.VendorSyncProcessor);
        fulfillmentService = module.get(fulfillment_service_1.FulfillmentService);
    });
    it('should process job correctly', async () => {
        const job = { data: { jobId: 'j1', vendorId: 'v1', orderLineItemId: 'i1', correlationId: 'c1' } };
        await processor.process(job);
        expect(fulfillmentService.processSyncJob).toHaveBeenCalledWith('j1', 'c1');
    });
});
//# sourceMappingURL=vendor-sync.processor.spec.js.map