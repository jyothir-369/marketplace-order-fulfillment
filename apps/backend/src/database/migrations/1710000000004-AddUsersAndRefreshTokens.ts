import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/** Phase 1 — auth + RBAC: users + refresh_tokens tables. */
export class AddUsersAndRefreshTokens1710000000004 implements MigrationInterface {
  name = 'AddUsersAndRefreshTokens1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Preserve existing records; create tables/indexes only when missing.
    const hasUsers = (await queryRunner.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'users'"
    )).length > 0;
    if (!hasUsers) {
      await queryRunner.createTable(
        new Table({
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
            { name: 'email', type: 'varchar', length: '255', isUnique: true },
            { name: 'password_hash', type: 'varchar', length: '255' },
            { name: 'role', type: 'enum', enum: ['buyer', 'vendor', 'admin', 'operations'], default: "'buyer'" },
            { name: 'vendor_id', type: 'uuid', isNullable: true },
            { name: 'display_name', type: 'varchar', length: '120', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );
    }
    const hasRefresh = (await queryRunner.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'refresh_tokens'"
    )).length > 0;
    if (!hasRefresh) {
      await queryRunner.createTable(
        new Table({
          name: 'refresh_tokens',
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
            { name: 'user_id', type: 'uuid' },
            { name: 'token_hash', type: 'varchar', length: '64', isUnique: true },
            { name: 'expires_at', type: 'timestamp' },
            { name: 'revoked_at', type: 'timestamp', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true,
      );
    }
    const hasIdxUser = (await queryRunner.query("SELECT 1 FROM pg_indexes WHERE indexname = 'idx_refresh_tokens_user_id'")).length > 0;
    if (!hasIdxUser) {
      await queryRunner.createIndex('refresh_tokens', new TableIndex({ name: 'idx_refresh_tokens_user_id', columnNames: ['user_id'] }));
    }
    const hasIdxExpires = (await queryRunner.query("SELECT 1 FROM pg_indexes WHERE indexname = 'idx_refresh_tokens_expires_at'")).length > 0;
    if (!hasIdxExpires) {
      await queryRunner.createIndex('refresh_tokens', new TableIndex({ name: 'idx_refresh_tokens_expires_at', columnNames: ['expires_at'] }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('refresh_tokens');
    await queryRunner.dropTable('users');
  }
}