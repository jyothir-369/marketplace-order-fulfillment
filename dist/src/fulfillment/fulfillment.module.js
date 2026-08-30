"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const fulfillment_controller_1 = require("./fulfillment.controller");
const fulfillment_service_1 = require("./fulfillment.service");
const vendor_sync_processor_1 = require("./vendor-sync.processor");
const reconciliation_scheduler_1 = require("./reconciliation.scheduler");
const order_line_item_entity_1 = require("../common/entities/order-line-item.entity");
const vendor_sync_job_entity_1 = require("../common/entities/vendor-sync-job.entity");
const order_entity_1 = require("../common/entities/order.entity");
let FulfillmentModule = class FulfillmentModule {
};
exports.FulfillmentModule = FulfillmentModule;
exports.FulfillmentModule = FulfillmentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([order_line_item_entity_1.OrderLineItem, vendor_sync_job_entity_1.VendorSyncJob, order_entity_1.Order]),
            bullmq_1.BullModule.registerQueue({ name: vendor_sync_processor_1.VENDOR_SYNC_QUEUE }),
            schedule_1.ScheduleModule.forRoot(),
        ],
        controllers: [fulfillment_controller_1.FulfillmentController],
        providers: [fulfillment_service_1.FulfillmentService, vendor_sync_processor_1.VendorSyncProcessor, reconciliation_scheduler_1.ReconciliationScheduler],
        exports: [fulfillment_service_1.FulfillmentService],
    })
], FulfillmentModule);
//# sourceMappingURL=fulfillment.module.js.map