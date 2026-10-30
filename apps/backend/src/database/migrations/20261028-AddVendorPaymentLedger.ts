import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVendorPaymentLedger2026102800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vendor_payment_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderReference" VARCHAR(255) NOT NULL,
        "vendorId" VARCHAR(255) NOT NULL,
        "amountPaise" BIGINT NOT NULL CHECK ("amountPaise" >= 0),
        "commissionPaise" BIGINT NOT NULL CHECK ("commissionPaise" >= 0),
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        "rulesVersion" VARCHAR(100) NOT NULL,
        "grossLinePaise" BIGINT NULL CHECK ("grossLinePaise" IS NULL OR "grossLinePaise" >= 0),
        "reconciliationStatus" VARCHAR(40) NULL,
        snapshot TEXT NULL,
        "idempotencyKey" VARCHAR(255) NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_vendor_payment_allocation_order_vendor
          UNIQUE ("orderReference", "vendorId")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_payment_allocation_idempotency
        ON vendor_payment_allocations ("idempotencyKey")
        WHERE "idempotencyKey" IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_vendor
        ON vendor_payment_allocations ("vendorId");

      CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_order
        ON vendor_payment_allocations ("orderReference");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS vendor_payment_allocations;
    `);
  }
}
