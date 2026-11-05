import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class CategoryBPromotionCheckoutSnapshot1793664000003 implements MigrationInterface {
  name = 'CategoryBPromotionCheckoutSnapshot1793664000003';

  public async up(qr: QueryRunner): Promise<void> {
    const exists = await qr.hasTable('promotion_checkout_snapshots');

    if (!exists) {
      await qr.createTable(new Table({
        name: 'promotion_checkout_snapshots',
        columns: [
          new TableColumn({ name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' }),
          new TableColumn({ name: 'promotion_id', type: 'uuid', isNullable: false }),
          new TableColumn({ name: 'checkout_attempt_id', type: 'uuid', isNullable: false }),
          new TableColumn({ name: 'order_id', type: 'uuid', isNullable: false }),
          new TableColumn({ name: 'captured_at', type: 'timestamp', isNullable: false }),
          new TableColumn({ name: 'currency', type: 'varchar', length: '3', isNullable: false, default: "'USD'" }),
          new TableColumn({ name: 'funding_type', type: 'varchar', length: '20', isNullable: false }),
          new TableColumn({ name: 'vendor_contribution_percent', type: 'decimal', precision: 5, scale: 2, isNullable: false }),
          new TableColumn({ name: 'marketplace_contribution_percent', type: 'decimal', precision: 5, scale: 2, isNullable: false }),
          new TableColumn({ name: 'approval_state', type: 'varchar', length: '20', isNullable: false }),
          new TableColumn({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, isNullable: false }),
          new TableColumn({ name: 'original_unit_price_cents', type: 'int', isNullable: false }),
          new TableColumn({ name: 'discounted_unit_price_cents', type: 'int', isNullable: false }),
          new TableColumn({ name: 'discount_amount_cents', type: 'int', isNullable: false }),
          new TableColumn({ name: 'vendor_funding_cents', type: 'int', isNullable: false }),
          new TableColumn({ name: 'marketplace_funding_cents', type: 'int', isNullable: false }),
          new TableColumn({ name: 'total_funding_cents', type: 'int', isNullable: false }),
          new TableColumn({ name: 'line_item_id', type: 'uuid', isNullable: false }),
          new TableColumn({ name: 'captured_amount_cents', type: 'int', isNullable: false }),
          new TableColumn({ name: 'reconciled', type: 'boolean', default: false, isNullable: false }),
          new TableColumn({ name: 'reconciliation_note', type: 'text', isNullable: true }),
          new TableColumn({ name: 'created_at', type: 'timestamp', default: 'now()', isNullable: false }),
        ],
      }));
    }

    const duplicateRows = await qr.query(`
      SELECT checkout_attempt_id, line_item_id, COUNT(*)::int AS duplicate_count
      FROM promotion_checkout_snapshots
      GROUP BY checkout_attempt_id, line_item_id
      HAVING COUNT(*) > 1
      LIMIT 1
    `);

    if (duplicateRows.length > 0) {
      throw new Error(
        'Cannot enforce Category B snapshot retry uniqueness: duplicate checkout_attempt_id/line_item_id rows already exist. Resolve duplicates in an isolated database before retrying this migration.',
      );
    }

    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_promotion_snapshot_attempt_line
      ON promotion_checkout_snapshots (checkout_attempt_id, line_item_id)
    `);

    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_snap_order
      ON promotion_checkout_snapshots (order_id, captured_at)
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    // Keep immutable checkout evidence; rollback removes only indexes introduced here.
    await qr.query('DROP INDEX IF EXISTS uq_promotion_snapshot_attempt_line');
    await qr.query('DROP INDEX IF EXISTS idx_snap_order');
  }
}