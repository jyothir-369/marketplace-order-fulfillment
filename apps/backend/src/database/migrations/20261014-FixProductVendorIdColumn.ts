import { MigrationInterface, QueryRunner } from 'typeorm';
export class FixProductVendorIdColumn20261014 implements MigrationInterface {
  name = 'FixProductVendorIdColumn20261014';
  public async up(queryRunner: QueryRunner): Promise<void> {
    const res = await queryRunner.query(`SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='vendor_id'`);
    if (res && res.length > 0) {
      await queryRunner.query(`ALTER TABLE "products" RENAME COLUMN "vendor_id" TO "vendorId"`);
    }
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    const res = await queryRunner.query(`SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='vendorId'`);
    if (res && res.length > 0) {
      await queryRunner.query(`ALTER TABLE "products" RENAME COLUMN "vendorId" TO "vendor_id"`);
    }
  }
}
