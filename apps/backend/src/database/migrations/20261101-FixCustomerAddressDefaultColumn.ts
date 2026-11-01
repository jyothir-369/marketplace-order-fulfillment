import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCustomerAddressDefaultColumn2026110100000
  implements MigrationInterface
{
  name = 'FixCustomerAddressDefaultColumn2026110100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('customer_addresses');

    if (!tableExists) {
      throw new Error(
        'Cannot repair customer_addresses: table does not exist.',
      );
    }

    const hasLegacyColumn = await queryRunner.hasColumn(
      'customer_addresses',
      'isDefault',
    );

    const hasCanonicalColumn = await queryRunner.hasColumn(
      'customer_addresses',
      'is_default',
    );

    if (hasLegacyColumn && !hasCanonicalColumn) {
      await queryRunner.renameColumn(
        'customer_addresses',
        'isDefault',
        'is_default',
      );
      return;
    }

    if (!hasLegacyColumn && hasCanonicalColumn) {
      return;
    }

    throw new Error(
      `Unexpected customer_addresses schema: isDefault=${hasLegacyColumn}, is_default=${hasCanonicalColumn}.`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('customer_addresses');

    if (!tableExists) {
      throw new Error(
        'Cannot reverse customer_addresses column repair: table does not exist.',
      );
    }

    const hasLegacyColumn = await queryRunner.hasColumn(
      'customer_addresses',
      'isDefault',
    );

    const hasCanonicalColumn = await queryRunner.hasColumn(
      'customer_addresses',
      'is_default',
    );

    if (!hasLegacyColumn && hasCanonicalColumn) {
      await queryRunner.renameColumn(
        'customer_addresses',
        'is_default',
        'isDefault',
      );
      return;
    }

    if (hasLegacyColumn && !hasCanonicalColumn) {
      return;
    }

    throw new Error(
      `Unexpected customer_addresses schema during rollback: isDefault=${hasLegacyColumn}, is_default=${hasCanonicalColumn}.`,
    );
  }
}
