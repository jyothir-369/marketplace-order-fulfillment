import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRazorpayPaymentSupport1716000000000
  implements MigrationInterface
{
  name = 'AddRazorpayPaymentSupport1716000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Additive enum value: existing payment statuses are preserved.
    await queryRunner.query(`
      ALTER TYPE "payment_authorizations_status_enum"
      ADD VALUE IF NOT EXISTS 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_authorizations"
      ADD COLUMN IF NOT EXISTS "provider_order_id" varchar(64)
    `);

    // Non-null provider order IDs must not be assigned to two payment rows.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      "uq_payment_authorizations_provider_order_id"
      ON "payment_authorizations" ("provider_order_id")
      WHERE "provider_order_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_payment_authorizations_provider_order_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_authorizations"
      DROP COLUMN IF EXISTS "provider_order_id"
    `);

    // PostgreSQL enum labels are intentionally retained on rollback.
    // Removing an enum value safely requires a separate type-rebuild operation.
  }
}