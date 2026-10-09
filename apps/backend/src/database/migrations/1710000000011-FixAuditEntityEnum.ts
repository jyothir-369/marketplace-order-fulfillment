import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix audit-log enum mismatch (Phase 5.1 follow-up).
 *
 * The previous migration (1710000000009) targeted 'audit_logs_entity_type_enum',
 * but the actual PostgreSQL enum attached to audit_logs.entityType is
 * 'audit_logs_entitytype_enum' (TypeORM naming). This migration discovers
 * the real enum name from information_schema/pg_catalog and adds PAYMENT
 * only to the correct type.
 */
export class FixAuditEntityEnum1710000000011 implements MigrationInterface {
  name = 'FixAuditEntityEnum1710000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Discover actual enum type attached to audit_logs.entity_type
    const enumResult = await queryRunner.query(`
      SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) AS enum_name
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = 'audit_logs'
        AND lower(replace(a.attname, '_', '')) = 'entitytype'
        AND n.nspname = 'public'
    `);
    const actualEnumName: string | undefined = enumResult?.[0]?.enum_name;
    if (!actualEnumName) {
      throw new Error('Could not discover audit_logs.entity_type enum type; aborting');
    }

    // 2. Only alter the discovered enum; never guess.
    await queryRunner.query(
      `ALTER TYPE "${actualEnumName}" ADD VALUE IF NOT EXISTS 'PAYMENT'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL cannot drop a single enum value cleanly; leave it.
    // Idempotent: value presence is harmless.
  }
}
