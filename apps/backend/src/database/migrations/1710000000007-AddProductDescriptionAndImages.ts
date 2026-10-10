import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2.3 — Real `products.description` / `products.images` columns.
 *
 * The service used to read `(product as any).description / images` — columns
 * that never existed — so API responses were silently `undefined`. Add them as
 * real columns: `description` text, `images` text[] (Postgres native array,
 * matching the frontend `images?: string[] | null` contract).
 */
export class AddProductDescriptionAndImages1710000000007 implements MigrationInterface {
  name = 'AddProductDescriptionAndImages1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" text
    `);
    await queryRunner.query(`
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "images" text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "images"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "description"`);
  }
}