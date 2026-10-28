import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddVendorPaymentAccounts2026102700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_payment_accounts" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "vendorId" VARCHAR(255) NOT NULL,
        provider VARCHAR(50) DEFAULT 'razorpay',
        "linkedAccountId" VARCHAR(255),
        onboardingState VARCHAR(50) DEFAULT 'PENDING',
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vpa_vendor_provider ON "vendor_payment_accounts"("vendorId", provider);
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_vpa_vendor_provider; DROP TABLE IF EXISTS "vendor_payment_accounts";');
  }
}
