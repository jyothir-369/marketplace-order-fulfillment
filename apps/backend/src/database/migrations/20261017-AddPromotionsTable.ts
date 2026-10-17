import { MigrationInterface, QueryRunner, Table } from 'typeorm';
export class AddPromotionsTable2026101700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'promotions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'discount_percent', type: 'decimal', precision: 10, scale: 2, isNullable: false },
          { name: 'is_active', type: 'boolean', default: true, isNullable: false },
          { name: 'start_date', type: 'timestamp', isNullable: true },
          { name: 'end_date', type: 'timestamp', isNullable: true },
          { name: 'vendor_id', type: 'uuid', isNullable: false },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
        ],
        foreignKeys: [
          { columnNames: ['vendor_id'], referencedTableName: 'vendors', referencedColumnNames: ['id'], onDelete: 'CASCADE' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('promotions', new (require('typeorm').Index)('idx_promo_vendor', ['vendor_id']));
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('promotions', true, true);
  }
}
