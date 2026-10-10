import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2.2 — Backing sequence for human-facing `orders.order_number`.
 *
 * `orders.order_number` (varchar(20) unique) already exists from migration
 * 0003 but nothing ever wrote it. This provisions `order_number_seq`, read via
 * `nextval()` inside the checkout transaction and formatted in application code
 * as `ORD-YYYYMMDD-NNNNNN`.
 */
export class AddOrderNumberSequence1710000000008 implements MigrationInterface {
  name = 'AddOrderNumberSequence1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS "order_number_seq"
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "order_number_seq"`);
  }
}