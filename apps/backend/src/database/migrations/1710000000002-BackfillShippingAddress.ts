import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillShippingAddress1710000000002 implements MigrationInterface {
  name = 'BackfillShippingAddress1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only backfill when an actual source is available; never invent a default.
    // Read-only check: count NULL shipping_address rows. If >0 and no trusted
    // source exists, leave NULL rather than fabricating data.
    const result = await queryRunner.query(
      "SELECT COUNT(*) as cnt FROM orders WHERE shipping_address IS NULL"
    );
    console.log('Backfill check: orders with NULL shipping_address =', result[0]?.cnt ?? 0);
    // Intentional no-op unless a verified address source is configured.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No destructive rollback: do not overwrite genuine user data.
    // If backfill had occurred, a targeted restore from backup would be needed.
  }
}