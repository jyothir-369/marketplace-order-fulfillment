import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartialUniquePendingApplicantIndex2026101300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Before adding the index, verify no conflicting duplicates exist
    const duplicates: { count: number }[] = await queryRunner.query(`
      SELECT COUNT(*) as count FROM (
        SELECT applicant_user_id FROM vendor_applications
        WHERE status = 'pending' AND applicant_user_id IS NOT NULL
        GROUP BY applicant_user_id HAVING COUNT(*) > 1
      ) sub
    `);
    const conflictCount = parseInt(String(duplicates?.[0]?.count ?? '0'), 10);
    if (conflictCount > 0) {
      throw new Error(
        `Migration blocked: ${conflictCount} duplicate pending applicant record(s) exist. ` +
        `Resolve duplicates manually (e.g., merge or delete extra pending records) before adding the partial unique index.`
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_applications_pending_applicant
      ON vendor_applications (applicant_user_id)
      WHERE status = 'pending' AND applicant_user_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_vendor_applications_pending_applicant
    `);
  }
}

