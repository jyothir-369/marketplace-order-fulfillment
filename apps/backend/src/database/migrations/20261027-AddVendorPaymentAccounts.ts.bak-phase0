import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddVendorPaymentAccounts20261027 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_payment_accounts" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "vendorId" VARCHAR(255) NOT NULL,
        provider VARCHAR(50) DEFAULT 'razorpay',
        "linkedAccountStatus" VARCHAR(50) DEFAULT 'PENDING',
        "linkedAccountReference" VARCHAR(255),
        "onboardingState" VARCHAR(50) DEFAULT 'PENDING',
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_vpa_vendor_provider_status ON "vendor_payment_accounts"("vendorId", provider, "linkedAccountStatus");
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_vpa_vendor_provider_status; DROP TABLE IF EXISTS "vendor_payment_accounts";');
  }
}
// Phase 4 additions (separate from Phase 2; kept in same file for independent review — can split into 20261028)
// Not executed on live DB without approval.
