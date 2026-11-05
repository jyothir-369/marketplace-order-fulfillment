import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3AddPromotionSnapshotColumns1793491200000 implements MigrationInterface {
  name = 'Phase3AddPromotionSnapshotColumns1793491200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'order_line_items';
    const table = await queryRunner.getTable(tableName);

    if (!table) {
      throw new Error(
        'Cannot add promotion snapshot columns: order_line_items table does not exist.',
      );
    }

    if (!table.findColumnByName('effective_unit_price')) {
      await queryRunner.query(
        'ALTER TABLE "order_line_items" ADD COLUMN "effective_unit_price" DECIMAL(10,2) NULL',
      );
    }

    if (!table.findColumnByName('promotion_id')) {
      await queryRunner.query(
        'ALTER TABLE "order_line_items" ADD COLUMN "promotion_id" UUID NULL',
      );
    }

    if (!table.findColumnByName('promotion_discount_percent')) {
      await queryRunner.query(
        'ALTER TABLE "order_line_items" ADD COLUMN "promotion_discount_percent" DECIMAL(5,2) NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('order_line_items');
    if (!table) return;

    if (table.findColumnByName('promotion_discount_percent')) {
      await queryRunner.query(
        'ALTER TABLE "order_line_items" DROP COLUMN "promotion_discount_percent"',
      );
    }

    if (table.findColumnByName('promotion_id')) {
      await queryRunner.query(
        'ALTER TABLE "order_line_items" DROP COLUMN "promotion_id"',
      );
    }

    if (table.findColumnByName('effective_unit_price')) {
      await queryRunner.query(
        'ALTER TABLE "order_line_items" DROP COLUMN "effective_unit_price"',
      );
    }
  }
}
