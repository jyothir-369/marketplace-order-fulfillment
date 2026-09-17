import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5.1 — Mock payment authorizations.
 *
 * 1. `payment_authorizations` table backing the `PaymentAuthorization` entity.
 * 2. New audit actions (`PAYMENT_AUTHORIZED` / `PAYMENT_FAILED` /
 *    `PAYMENT_REFUNDED`) and the `PAYMENT` entity type appended to the existing
 *    Postgres enum types. The Baseline migration hardcodes the original enum
 *    value lists, so new values MUST be appended here or inserts would fail.
 *
 * Enum type names follow the `<table>_<column>_enum` convention the Baseline
 * uses (matching what synchronize produced), i.e.
 * `payment_authorizations_status_enum`.
 *
 * The new audit enum values are intentionally NOT removed in `down()` :
 * PostgreSQL cannot cheaply drop a single enum value, and leaving them is
 * harmless (unused values are valid).
 */
export class AddPaymentAuthorizations1710000000009 implements MigrationInterface {
  name = 'AddPaymentAuthorizations1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. enum for payment_authorizations.status ────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_authorizations_status_enum"
          AS ENUM ('authorized','captured','failed','refunded');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ── 2. append payment values to the audit enum types ─────────────────────
    for (const value of ['PAYMENT_AUTHORIZED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED']) {
      await queryRunner.query(
        `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS '${value}'`,
      );
    }
    await queryRunner.query(
      `ALTER TYPE "audit_logs_entity_type_enum" ADD VALUE IF NOT EXISTS 'PAYMENT'`,
    );

    // ── 3. payment_authorizations table ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_authorizations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" "payment_authorizations_status_enum" NOT NULL DEFAULT 'authorized',
        "provider" varchar(32) NOT NULL DEFAULT 'mock',
        "provider_reference" varchar(64),
        "correlation_id" varchar(100),
        "failure_reason" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payment_authorizations" PRIMARY KEY ("id")
      )
    `);

    // ── 4. FK to orders + lookup index ───────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "payment_authorizations"
          ADD CONSTRAINT "fk_payment_authorizations_order"
          FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_payment_authorizations_order_id"
         ON "payment_authorizations" ("order_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payment_authorizations_order_id"`);
    await queryRunner.query(
      `ALTER TABLE "payment_authorizations" DROP CONSTRAINT IF EXISTS "fk_payment_authorizations_order"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_authorizations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_authorizations_status_enum"`);
  }
}
