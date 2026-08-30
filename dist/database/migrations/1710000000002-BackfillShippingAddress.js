"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackfillShippingAddress1710000000002 = void 0;
class BackfillShippingAddress1710000000002 {
    constructor() {
        this.name = 'BackfillShippingAddress1710000000002';
    }
    async up(queryRunner) {
        await queryRunner.query("UPDATE orders SET shipping_address = 'Default Shipping Address - Legacy Order' WHERE shipping_address IS NULL");
        console.log('Backfill complete: Updated shipping_address for existing orders');
    }
    async down(queryRunner) {
        await queryRunner.query("UPDATE orders SET shipping_address = NULL WHERE shipping_address = 'Default Shipping Address - Legacy Order'");
    }
}
exports.BackfillShippingAddress1710000000002 = BackfillShippingAddress1710000000002;
//# sourceMappingURL=1710000000002-BackfillShippingAddress.js.map