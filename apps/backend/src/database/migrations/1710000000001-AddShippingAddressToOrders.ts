import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddShippingAddressToOrders1710000000001 implements MigrationInterface {
  name = 'AddShippingAddressToOrders1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const colCheck = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_address'`,
    );
    if (colCheck.length === 0) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'shipping_address',
          type: 'varchar',
          length: '500',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(
      "COMMENT ON COLUMN orders.shipping_address IS 'Added in expand-and-contract migration Phase 7'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders', 'shipping_address');
  }
}