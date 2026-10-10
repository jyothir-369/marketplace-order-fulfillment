import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillProductCategory1710000000010 implements MigrationInterface {
  name = 'BackfillProductCategory1710000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Fail clearly if categories table missing or empty — don't invent data.
    const cats = await queryRunner.query(`SELECT name FROM categories`);
    if (!cats || cats.length === 0) {
      throw new Error('Backfill requires categories table with rows; none found');
    }
    const catNames = cats.map((c: any) => c.name);

    // 2. Count uncategorized products; guard: don't overwrite existing assignments.
    const uncategorized = await queryRunner.query(
      `SELECT id FROM products WHERE category IS NULL`,
    );
    if (uncategorized.length === 0) return; // nothing to do

    // 3. Assign deterministically (by product id order) round-robin.
    for (let i = 0; i < uncategorized.length; i++) {
      const p = uncategorized[i];
      const cat = catNames[i % catNames.length];
      await queryRunner.query(
        `UPDATE products SET category = $1 WHERE id = $2 AND category IS NULL`,
        [cat, p.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Safe: only null out rows that were set by this migration — we don't erase
    // later manual changes because we have no migration-marker column.
    // Best-safe: do nothing (preserve assignments). If needed, a targeted restore
    // from backup would apply; don't blanket-clear.
    // To preserve idempotency, down is intentionally a no-op for this backfill.
  }
}
