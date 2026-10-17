import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuyerIdempotencyKeyConstraint2026101500000 implements MigrationInterface {
  name = 'AddBuyerIdempotencyKeyConstraint2026101500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Dependency fix: column must exist before index references it
    await queryRunner.query(`
      DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'idempotency_key') THEN ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(255) NULL; END IF; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'idempotency_payload_hash') THEN ALTER TABLE orders ADD COLUMN idempotency_payload_hash VARCHAR(500); END IF; END $$
    `);
    // Partial unique index after column exists (safe)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_buyer_idempotency
      ON orders (buyer_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_buyer_idempotency`);
  }
}
