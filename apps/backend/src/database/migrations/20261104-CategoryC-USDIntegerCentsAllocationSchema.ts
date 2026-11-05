import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryCUSDIntegerCentsAllocationSchema2026110400000 implements MigrationInterface {
  public readonly name = 'CategoryCUSDIntegerCentsAllocationSchema2026110400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('vendor_payment_allocations'))) {
      throw new Error('Category C migration requires vendor_payment_allocations');
    }

    await queryRunner.query(`
      ALTER TABLE vendor_payment_allocations
        ADD COLUMN IF NOT EXISTS amount_cents BIGINT NULL,
        ADD COLUMN IF NOT EXISTS commission_cents BIGINT NULL,
        ADD COLUMN IF NOT EXISTS gross_line_cents BIGINT NULL;

      ALTER TABLE vendor_payment_allocations
        ALTER COLUMN currency SET DEFAULT 'USD';
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally non-destructive: preserve historical INR and newly recorded USD allocations.
  }
}
