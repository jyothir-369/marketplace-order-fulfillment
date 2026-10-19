import { MigrationInterface, QueryRunner } from 'typeorm';

export class VendorLinkSafeguards20261012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pre-check: must return 0 rows; if not, abort manually
    const bad = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'vendor' AND vendor_id IS NULL`,
    );
    if (bad && bad.length > 0) {
      throw new Error(`Migration blocked: ${bad.length} vendor-role user(s) have null vendor_id: ${bad.map((r: any) => r.id).join(', ')}`);
    }
    await queryRunner.query(`ALTER TABLE users ADD CONSTRAINT fk_users_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) NOT VALID`);
    await queryRunner.query(`ALTER TABLE users VALIDATE CONSTRAINT fk_users_vendor`);
    await queryRunner.query(`ALTER TABLE users ADD CONSTRAINT chk_users_vendor_role CHECK (role <> 'vendor' OR vendor_id IS NOT NULL) NOT VALID`);
    await queryRunner.query(`ALTER TABLE users VALIDATE CONSTRAINT chk_users_vendor_role`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT chk_users_vendor_role`);
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT fk_users_vendor`);
  }
}
