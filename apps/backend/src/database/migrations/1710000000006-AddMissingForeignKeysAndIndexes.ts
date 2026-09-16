import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2.4 — Missing foreign keys + indexes (and index catch-up).
 *
 * 1. Rename `products.vendorId` -> `vendor_id` (the entity and every other FK
 *    in the DB use snake_case; this column was the odd one out).
 * 2. `fk_products_vendor` — products.vendor_id -> vendors.id.
 * 3. `fk_orders_buyer_user` — orders.buyer_user_id -> users.id.
 * 4. `idx_products_vendor_id` and `idx_audit_logs_user_id`.
 * 5. All remaining entity-declared indexes (the 0000 baseline intentionally
 *    creates no indexes, so they are provisioned here idempotently — that keeps
 *    a fresh database byte-for-byte at parity with an existing synchronize-built
 *    one, where these already exist under TypeORM-generated names).
 *
 * Every statement is guarded so this migration is safe on both a fresh DB
 * (post-baseline) and a pre-existing DB that was created by `synchronize: true`.
 */
export class AddMissingForeignKeysAndIndexes1710000000006 implements MigrationInterface {
  name = 'AddMissingForeignKeysAndIndexes1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Rename vendorId -> vendor_id (only if the camelCase one exists) ────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'vendorId'
        ) THEN
          ALTER TABLE "products" RENAME COLUMN "vendorId" TO "vendor_id";
        END IF;
      END $$;
    `);

    // ── 2. fk_products_vendor ────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_vendor') THEN
          ALTER TABLE "products" ADD CONSTRAINT "fk_products_vendor"
            FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id");
        END IF;
      END $$;
    `);

    // ── 3. fk_orders_buyer_user ──────────────────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_buyer_user') THEN
          ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_buyer_user"
            FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id");
        END IF;
      END $$;
    `);

    // ── 4. Missing indexes from 2.4 ──────────────────────────────────────────
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_vendor_id" ON "products" ("vendor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id")`);

    // ── 5. Remaining entity-declared indexes (baseline creates tables bare) ──
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_buyer_id_status" ON "orders" ("buyer_id", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_line_items_order_id_vendor_id" ON "order_line_items" ("order_id", "vendor_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_sync_jobs_status_last_attempted_at" ON "vendor_sync_jobs" ("status", "last_attempted_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_correlation_id" ON "audit_logs" ("correlation_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type_entity_id" ON "audit_logs" ("entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const idx of [
      'idx_audit_logs_created_at',
      'idx_audit_logs_action',
      'idx_audit_logs_entity_type_entity_id',
      'idx_audit_logs_correlation_id',
      'idx_sync_jobs_status_last_attempted_at',
      'idx_line_items_order_id_vendor_id',
      'idx_orders_buyer_id_status',
      'idx_audit_logs_user_id',
      'idx_products_vendor_id',
    ]) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${idx}"`);
    }
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "fk_orders_buyer_user"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "fk_products_vendor"`);
  }
}