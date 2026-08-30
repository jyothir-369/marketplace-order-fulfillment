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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderLineItem = exports.FulfillmentStatus = void 0;
const typeorm_1 = require("typeorm");
const order_entity_1 = require("./order.entity");
const product_entity_1 = require("./product.entity");
const vendor_entity_1 = require("./vendor.entity");
const vendor_sync_job_entity_1 = require("./vendor-sync-job.entity");
var FulfillmentStatus;
(function (FulfillmentStatus) {
    FulfillmentStatus["PENDING"] = "pending";
    FulfillmentStatus["SYNCING"] = "syncing";
    FulfillmentStatus["CONFIRMED"] = "confirmed";
    FulfillmentStatus["FAILED"] = "failed";
    FulfillmentStatus["DEAD_LETTER"] = "dead_letter";
    FulfillmentStatus["AMBIGUOUS"] = "ambiguous";
})(FulfillmentStatus || (exports.FulfillmentStatus = FulfillmentStatus = {}));
let OrderLineItem = class OrderLineItem {
};
exports.OrderLineItem = OrderLineItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], OrderLineItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'order_id' }),
    __metadata("design:type", String)
], OrderLineItem.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, (order) => order.lineItems),
    (0, typeorm_1.JoinColumn)({ name: 'order_id' }),
    __metadata("design:type", order_entity_1.Order)
], OrderLineItem.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'product_id' }),
    __metadata("design:type", String)
], OrderLineItem.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, (product) => product.orderLineItems),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], OrderLineItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'vendor_id' }),
    __metadata("design:type", String)
], OrderLineItem.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => vendor_entity_1.Vendor, (vendor) => vendor.orderLineItems),
    (0, typeorm_1.JoinColumn)({ name: 'vendor_id' }),
    __metadata("design:type", vendor_entity_1.Vendor)
], OrderLineItem.prototype, "vendor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], OrderLineItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], OrderLineItem.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], OrderLineItem.prototype, "lineTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: FulfillmentStatus,
        default: FulfillmentStatus.PENDING,
        name: 'fulfillment_status',
    }),
    __metadata("design:type", String)
], OrderLineItem.prototype, "fulfillmentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true, name: 'vendor_reference' }),
    __metadata("design:type", String)
], OrderLineItem.prototype, "vendorReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'failure_reason' }),
    __metadata("design:type", String)
], OrderLineItem.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => vendor_sync_job_entity_1.VendorSyncJob, (syncJob) => syncJob.orderLineItem),
    __metadata("design:type", vendor_sync_job_entity_1.VendorSyncJob)
], OrderLineItem.prototype, "syncJob", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], OrderLineItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], OrderLineItem.prototype, "updatedAt", void 0);
exports.OrderLineItem = OrderLineItem = __decorate([
    (0, typeorm_1.Entity)('order_line_items'),
    (0, typeorm_1.Index)(['orderId', 'vendorId'])
], OrderLineItem);
//# sourceMappingURL=order-line-item.entity.js.map