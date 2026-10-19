import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVendorUserConstraints2026101300000 implements MigrationInterface {
  name = 'AddVendorUserConstraints2026101300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const preNull = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM users
       WHERE role = 'vendor' AND vendor_id IS NULL`
    );

    const preOrphan = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM users u
       WHERE u.vendor_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM vendors v WHERE v.id = u.vendor_id
         )`
    );

    if (Number(preNull[0]?.count ?? 0) > 0) {
      throw new Error(
        'Migration blocked: vendor users exist without vendor_id.'
      );
    }

    if (Number(preOrphan[0]?.count ?? 0) > 0) {
      throw new Error(
        'Migration blocked: users reference nonexistent vendors.'
      );
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'fk_users_vendor'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT fk_users_vendor
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) NOT VALID;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE users VALIDATE CONSTRAINT fk_users_vendor
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_users_vendor_role'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT chk_users_vendor_role
          CHECK (role <> 'vendor' OR vendor_id IS NOT NULL) NOT VALID;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE users VALIDATE CONSTRAINT chk_users_vendor_role
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_vendor_role'
    );
    await queryRunner.query(
      'ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_vendor'
    );
  }
}
