import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuyerIdempotencyKeyConstraint20261015 implements MigrationInterface {
  name = 'AddBuyerIdempotencyKeyConstraint20261015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Partial unique index: buyer-scoped idempotency key (nullable allowed, but when set must be unique per buyer)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_buyer_idempotency
      ON orders (buyer_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `);
    // Add fingerprint column if missing (reversible expand-and-contract)
    await queryRunner.query(`
      DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'idempotency_payload_hash') THEN ALTER TABLE orders ADD COLUMN idempotency_payload_hash VARCHAR(500); END IF; END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_buyer_idempotency`);
  }
}
