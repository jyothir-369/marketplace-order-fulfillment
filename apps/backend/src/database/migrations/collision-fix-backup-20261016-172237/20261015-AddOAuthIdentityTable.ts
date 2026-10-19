import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthIdentityTable20261015 implements MigrationInterface {
  name = 'AddOAuthIdentityTable20261015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS oauth_identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(50) NOT NULL,
        provider_subject VARCHAR(255) NOT NULL,
        user_id UUID NOT NULL,
        provider_email VARCHAR(255) NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider, provider_subject)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_identities(provider)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth_identities(user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_oauth_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_oauth_provider`);
    await queryRunner.query(`DROP TABLE IF EXISTS oauth_identities`);
  }
}
