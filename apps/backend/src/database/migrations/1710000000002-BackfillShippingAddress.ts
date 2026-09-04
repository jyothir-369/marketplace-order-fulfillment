import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillShippingAddress1710000000002 implements MigrationInterface {
  name = 'BackfillShippingAddress1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE orders SET shipping_address = 'Default Shipping Address - Legacy Order' WHERE shipping_address IS NULL"
    );

    console.log('Backfill complete: Updated shipping_address for existing orders');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "UPDATE orders SET shipping_address = NULL WHERE shipping_address = 'Default Shipping Address - Legacy Order'"
    );
  }
}