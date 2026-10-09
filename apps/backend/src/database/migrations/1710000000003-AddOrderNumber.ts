import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderNumber1710000000003 implements MigrationInterface {
  name = 'AddOrderNumber1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check existing column before adding.
    const colCheck = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number'`
    );
    if (colCheck.length > 0) {
      console.log('order_number column already exists; skipping ADD COLUMN');
    } else {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'order_number',
          type: 'varchar',
          length: '20',
          isNullable: true,
          isUnique: true,
        }),
      );
    }

    // Check for duplicate non-NULL values before enforcing unique; fail clearly.
    const dupCheck = await queryRunner.query(
      `SELECT order_number, COUNT(*) as c FROM orders WHERE order_number IS NOT NULL GROUP BY order_number HAVING COUNT(*) > 1`
    );
    if (dupCheck && dupCheck.length > 0) {
      throw new Error(`Duplicate order_number values detected before adding unique constraint: ${JSON.stringify(dupCheck)}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders', 'order_number');
  }
}
