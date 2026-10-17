import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerAddressesMigration2026101000000 implements MigrationInterface {
  name = 'CustomerAddressesMigration2026101000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        label varchar(50) NOT NULL DEFAULT 'Home',
        street varchar(500) NOT NULL,
        city varchar(100) NOT NULL,
        state varchar(100),
        zip varchar(20),
        country varchar(100) NOT NULL DEFAULT 'India',
        "isDefault" boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_customer_addresses_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id
      ON customer_addresses(user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE IF EXISTS customer_addresses'
    );
  }
}
