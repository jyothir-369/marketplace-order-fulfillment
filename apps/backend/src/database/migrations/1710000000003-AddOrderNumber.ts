import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderNumber1710000000003 implements MigrationInterface {
  name = 'AddOrderNumber1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders', 'order_number');
  }
}
