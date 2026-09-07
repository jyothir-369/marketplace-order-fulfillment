import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductImageAndDescription1710000000004 implements MigrationInterface {
  name = 'AddProductImageAndDescription1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'image_url',
        type: 'varchar',
        length: '500',
        isNullable: true,
        default: null,
      }),
    );
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: true,
        default: null,
      }),
    );
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'rating',
        type: 'int',
        default: 4,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('products', 'rating');
    await queryRunner.dropColumn('products', 'description');
    await queryRunner.dropColumn('products', 'image_url');
  }
}
