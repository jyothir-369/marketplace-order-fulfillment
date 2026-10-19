import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddFulfillmentOperationRecord1710000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'fulfillment_operation_records',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
        { name: 'sync_job_id', type: 'uuid', isNullable: true },
        { name: 'operation_id', type: 'varchar', length: '64', isNullable: false, isUnique: true },
        { name: 'order_line_item_id', type: 'uuid', isNullable: true },
        { name: 'vendor_id', type: 'varchar', length: '255', isNullable: true },
        { name: 'operation_state', type: 'varchar', length: '40', isNullable: false, default: "'pending'" },
        { name: 'vendor_reference', type: 'varchar', length: '255', isNullable: true },
        { name: 'attempts', type: 'int', default: 0, isNullable: false },
        { name: 'correlation_id', type: 'varchar', length: '255', isNullable: true },
        { name: 'created_at', type: 'timestamp', isNullable: true, default: 'now()' },
        { name: 'updated_at', type: 'timestamp', isNullable: true, default: 'now()' },
        { name: 'completed_at', type: 'timestamp', isNullable: true },
        { name: 'error_message', type: 'text', isNullable: true },
      ],
    }), true);
    await queryRunner.query("CREATE INDEX \"IDX_op_sync\" ON fulfillment_operation_records (sync_job_id)");
    await queryRunner.query("CREATE INDEX \"IDX_op_state\" ON fulfillment_operation_records (operation_state, updated_at)");
    await queryRunner.query("CREATE UNIQUE INDEX \"IDX_op_operation\" ON fulfillment_operation_records (operation_id)");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('fulfillment_operation_records');
  }
}
