import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddPasswordResetTokens20261016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prt_user" ON password_reset_tokens("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prt_token" ON password_reset_tokens("token_hash")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_prt_expires" ON password_reset_tokens("expires_at")`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prt_expires"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prt_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prt_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens`);
  }
}
