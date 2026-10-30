import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefundDisputeTables2026102900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "refundReference" VARCHAR(255) NOT NULL,
        "orderReference" VARCHAR(255) NOT NULL,
        "amountPaise" BIGINT NOT NULL CHECK ("amountPaise" >= 0),
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        state VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
        "providerRefundId" VARCHAR(255) NULL,
        "idempotencyKey" VARCHAR(255) NULL,
        reason TEXT NULL,
        "reconciliationNote" TEXT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_payment_refunds_reference UNIQUE ("refundReference")
      );

      CREATE INDEX IF NOT EXISTS idx_payment_refunds_order
        ON payment_refunds ("orderReference");

      CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_refunds_idempotency
        ON payment_refunds ("idempotencyKey")
        WHERE "idempotencyKey" IS NOT NULL;

      CREATE TABLE IF NOT EXISTS payment_disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "providerDisputeId" VARCHAR(255) NOT NULL,
        "orderReference" VARCHAR(255) NOT NULL,
        state VARCHAR(50) NOT NULL DEFAULT 'OPEN',
        "amountPaise" BIGINT NULL CHECK ("amountPaise" IS NULL OR "amountPaise" >= 0),
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        reason TEXT NULL,
        "providerPayload" TEXT NULL,
        "dueAt" TIMESTAMPTZ NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_payment_disputes_provider_reference
          UNIQUE ("providerDisputeId")
      );

      CREATE INDEX IF NOT EXISTS idx_payment_disputes_order
        ON payment_disputes ("orderReference");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS payment_disputes;
      DROP TABLE IF EXISTS payment_refunds;
    `);
  }
}
