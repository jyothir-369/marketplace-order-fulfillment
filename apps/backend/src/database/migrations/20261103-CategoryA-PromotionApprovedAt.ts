import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class CategoryAPromotionApprovedAt2026110300002 implements MigrationInterface {
  name = 'CategoryAPromotionApprovedAt2026110300002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('promotions');
    if (!table) throw new Error('promotions table missing');
    if (!table.findColumnByName('approved_at')) {
      await queryRunner.addColumn('promotions', new TableColumn({
        name: 'approved_at',
        type: 'timestamp',
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('promotions');
    if (table && table.findColumnByName('approved_at')) {
      await queryRunner.dropColumn('promotions', 'approved_at');
    }
  }
}
