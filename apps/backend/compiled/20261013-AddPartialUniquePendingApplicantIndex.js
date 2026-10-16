"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPartialUniquePendingApplicantIndex2026101300000 = void 0;
class AddPartialUniquePendingApplicantIndex2026101300000 {
    async up(queryRunner) {
        // Before adding the index, verify no conflicting duplicates exist
        const duplicates = await queryRunner.query(`
      SELECT COUNT(*) as count FROM (
        SELECT applicant_user_id FROM vendor_applications
        WHERE status = 'pending' AND applicant_user_id IS NOT NULL
        GROUP BY applicant_user_id HAVING COUNT(*) > 1
      ) sub
    `);
        const conflictCount = parseInt(String(duplicates?.[0]?.count ?? '0'), 10);
        if (conflictCount > 0) {
            throw new Error(`Migration blocked: ${conflictCount} duplicate pending applicant record(s) exist. ` +
                `Resolve duplicates manually (e.g., merge or delete extra pending records) before adding the partial unique index.`);
        }
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_applications_pending_applicant
      ON vendor_applications (applicant_user_id)
      WHERE status = 'pending' AND applicant_user_id IS NOT NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DROP INDEX IF EXISTS idx_vendor_applications_pending_applicant
    `);
    }
}
exports.AddPartialUniquePendingApplicantIndex2026101300000 = AddPartialUniquePendingApplicantIndex2026101300000;
