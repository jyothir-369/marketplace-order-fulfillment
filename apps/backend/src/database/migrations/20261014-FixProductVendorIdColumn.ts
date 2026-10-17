import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProductVendorIdColumn2026101400000 implements MigrationInterface {
  name = 'FixProductVendorIdColumn2026101400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'products'
         AND column_name IN ('vendor_id', 'vendorId')`,
    );

    const names = new Set(columns.map((column) => column.column_name));

    // Keep the canonical snake_case column. Rename only if the old camelCase
    // spelling is present and the canonical column is absent.
    if (!names.has('vendor_id') && names.has('vendorId')) {
      await queryRunner.query(
        `ALTER TABLE "products" RENAME COLUMN "vendorId" TO "vendor_id"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ column_name: string }> = await queryRunner.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'products'
         AND column_name IN ('vendor_id', 'vendorId')`,
    );

    const names = new Set(columns.map((column) => column.column_name));

    if (names.has('vendor_id') && !names.has('vendorId')) {
      await queryRunner.query(
        `ALTER TABLE "products" RENAME COLUMN "vendor_id" TO "vendorId"`,
      );
    }
  }
}