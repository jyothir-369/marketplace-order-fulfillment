import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddVendorApplicationTable1749624000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'vendor_applications',
        columns: [
  { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
  { name: 'email', type: 'varchar', length: '255', isNullable: false },
  { name: 'business_name', type: 'varchar', length: '255', isNullable: false },
  { name: 'reason', type: 'text', isNullable: false },
  { name: 'status', type: 'enum', enum: ['pending', 'approved', 'rejected'], enumName: 'vendor_application_status', default: "'pending'", isNullable: false },
  { name: 'applicant_user_id', type: 'uuid', isNullable: true },
  { name: 'reviewer_user_id', type: 'uuid', isNullable: true },
  { name: 'reviewed_at', type: 'timestamp', isNullable: true },
  { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
  { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
],
        indices: [
          { columnNames: ['email'], isUnique: false },
          { columnNames: ['email', 'status'], isUnique: false },
          { columnNames: ['status'], isUnique: false },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('vendor_applications', true);
    await queryRunner.query("DROP TYPE IF EXISTS vendor_application_status;");
  }
}
