"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReconciliationScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const fulfillment_service_1 = require("./fulfillment.service");
let ReconciliationScheduler = ReconciliationScheduler_1 = class ReconciliationScheduler {
    constructor(fulfillmentService) {
        this.fulfillmentService = fulfillmentService;
        this.logger = new common_1.Logger(ReconciliationScheduler_1.name);
    }
    async handleReconciliation() {
        this.logger.log('Starting scheduled reconciliation');
        try {
            var result = await this.fulfillmentService.reconcile(10);
            this.logger.log('Reconciliation complete: processed=' + result.processed + ', resolved=' + result.resolved + ', errors=' + result.errors.length, ReconciliationScheduler_1.name);
        }
        catch (error) {
            var errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Reconciliation failed: ' + errorMessage, ReconciliationScheduler_1.name);
        }
    }
};
exports.ReconciliationScheduler = ReconciliationScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconciliationScheduler.prototype, "handleReconciliation", null);
exports.ReconciliationScheduler = ReconciliationScheduler = ReconciliationScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [fulfillment_service_1.FulfillmentService])
], ReconciliationScheduler);
//# sourceMappingURL=reconciliation.scheduler.js.map