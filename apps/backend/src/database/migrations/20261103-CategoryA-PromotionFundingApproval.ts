import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class CategoryAPromotionFundingApproval20261103 implements MigrationInterface {
  name = 'CategoryAPromotionFundingApproval20261103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('promotions');
    if (!table) throw new Error('promotions table missing for Category A migration');

    // Ownership-safe decimal precision/scale (10/2) matching promotion entity contract
    const additions = [
      { name: 'funding_type', type: 'varchar', length: '20', isNullable: false, default: "'VENDOR_FUNDED'" },
      { name: 'vendor_contribution_percent', type: 'decimal', precision: 10, scale: 2, isNullable: true },
      { name: 'marketplace_contribution_percent', type: 'decimal', precision: 10, scale: 2, isNullable: true },
      { name: 'currency', type: 'varchar', length: '3', isNullable: false, default: "'USD'" },
      { name: 'approval_state', type: 'varchar', length: '20', isNullable: false, default: "'PENDING'" },
      { name: 'approved_by', type: 'uuid', isNullable: true },
      { name: 'submitted_at', type: 'timestamp', isNullable: true },
    ];
    for (const col of additions) {
      if (!table.findColumnByName(col.name)) {
        await queryRunner.addColumn('promotions', new TableColumn({
          name: col.name,
          type: (col as any).type,
          length: (col as any).length,
          precision: (col as any).precision,
          scale: (col as any).scale,
          isNullable: (col as any).isNullable,
          default: (col as any).default,
        }));
      }
    }

    // Ownership-safe index creation with existence guard (Postgres pg_indexes query + Table check)
    const idxName = 'idx_promo_approval_state';
    const indexExists = await queryRunner.query(
      `SELECT 1 FROM pg_indexes WHERE indexname = $1 AND tablename = 'promotions'`, [idxName],
    );
    if (!indexExists || indexExists.length === 0) {
      const tbl = await queryRunner.getTable('promotions');
      const hasIndex = tbl && tbl.indices && tbl.indices.find((i: any) => i.name === idxName);
      if (!hasIndex) {
        await queryRunner.createIndex('promotions', new TableIndex({
          name: idxName,
          columnNames: ['approval_state'],
        }));
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const idxName = 'idx_promo_approval_state';
    try {
      const indexExists = await queryRunner.query(
        `SELECT 1 FROM pg_indexes WHERE indexname = $1 AND tablename = 'promotions'`, [idxName],
      );
      if (indexExists && indexExists.length > 0) {
        await queryRunner.dropIndex('promotions', idxName);
      }
    } catch { /* ignore if missing */ }
    const table = await queryRunner.getTable('promotions');
    const drops = ['funding_type', 'vendor_contribution_percent', 'marketplace_contribution_percent', 'currency', 'approval_state', 'approved_by', 'submitted_at'];
    for (const col of drops) {
      try {
        if (table && table.findColumnByName(col)) {
          await queryRunner.dropColumn('promotions', col);
        }
      } catch { /* ignore */ }
    }
  }
}
