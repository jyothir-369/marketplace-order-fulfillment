"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddShippingAddressToOrders1710000000001 = void 0;
const typeorm_1 = require("typeorm");
class AddShippingAddressToOrders1710000000001 {
    constructor() {
        this.name = 'AddShippingAddressToOrders1710000000001';
    }
    async up(queryRunner) {
        await queryRunner.addColumn('orders', new typeorm_1.TableColumn({
            name: 'shipping_address',
            type: 'varchar',
            length: '500',
            isNullable: true,
        }));
        await queryRunner.query("COMMENT ON COLUMN orders.shipping_address IS 'Added in expand-and-contract migration Phase 7'");
    }
    async down(queryRunner) {
        await queryRunner.dropColumn('orders', 'shipping_address');
    }
}
exports.AddShippingAddressToOrders1710000000001 = AddShippingAddressToOrders1710000000001;
//# sourceMappingURL=1710000000001-AddShippingAddressToOrders.js.map