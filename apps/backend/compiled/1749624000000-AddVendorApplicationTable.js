"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddVendorApplicationTable1749624000000 = void 0;
const typeorm_1 = require("typeorm");
class AddVendorApplicationTable1749624000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable('vendor_applications', true);
        await queryRunner.query("DROP TYPE IF EXISTS vendor_application_status;");
    }
}
exports.AddVendorApplicationTable1749624000000 = AddVendorApplicationTable1749624000000;
