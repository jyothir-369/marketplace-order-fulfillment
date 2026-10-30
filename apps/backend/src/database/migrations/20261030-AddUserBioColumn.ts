import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddUserBioColumn2026103000000 implements MigrationInterface {
  name = 'AddUserBioColumn2026103000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN bio VARCHAR(280) NULL`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN bio`);
  }
}
