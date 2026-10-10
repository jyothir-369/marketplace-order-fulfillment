import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerAddressesMigration implements MigrationInterface {
  name = 'CustomerAddressesMigration';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS customer_addresses (...)`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS customer_addresses`);
  }
}
