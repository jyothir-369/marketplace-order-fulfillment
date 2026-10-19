import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddVendorUserConstraints2026101300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const preNull = await queryRunner.query(`SELECT COUNT(*) FROM users WHERE role = 'vendor' AND vendor_id IS NULL`);
    const preOrphan = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM users u WHERE u.vendor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vendors v WHERE v.id = u.vendor_id)`,
    );
    if (parseInt(preNull[0]?.count ?? '0', 10) > 0) throw new Error('Pre-check: vendor accounts without vendor_id exist');
    if (parseInt(preOrphan[0]?.cnt ?? '0', 10) > 0) throw new Error('Pre-check: orphaned vendor IDs reference nonexistent vendors');
    await queryRunner.query(`ALTER TABLE users ADD CONSTRAINT fk_users_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) NOT VALID`);
    await queryRunner.query(`ALTER TABLE users VALIDATE CONSTRAINT fk_users_vendor`);
    await queryRunner.query(`ALTER TABLE users ADD CONSTRAINT chk_users_vendor_role CHECK (role <> 'vendor' OR vendor_id IS NOT NULL) NOT VALID`);
    await queryRunner.query(`ALTER TABLE users VALIDATE CONSTRAINT chk_users_vendor_role`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role`);
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor`);
  }
}
