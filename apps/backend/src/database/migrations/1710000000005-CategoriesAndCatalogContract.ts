import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Phase 2 — Categories + Catalog Contract
 *
 * 1. Create `categories` table (canonical category registry).
 * 2. Add `slug` and `category` columns to `products` (nullable for existing rows).
 * 3. Add `buyer_user_id` to `orders` (powers `GET /api/orders/me`).
 * 4. Backfill: seed 5 default categories, assign them round-robin to existing products,
 *    and generate URL-friendly slugs from product names.
 */
export class CategoriesAndCatalogContract1710000000005 implements MigrationInterface {
  name = 'CategoriesAndCatalogContract1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. categories table ──────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          { name: 'name', type: 'varchar', length: '120', isUnique: true },
          { name: 'slug', type: 'varchar', length: '160' },
          { name: 'description', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'categories',
      new TableIndex({ name: 'idx_categories_slug', columnNames: ['slug'] }),
    );

    // ── 2. products — add slug + category columns ─────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "slug" varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category" varchar(120) NULL`,
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'idx_products_slug', columnNames: ['slug'] }),
    );
    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'idx_products_category', columnNames: ['category'] }),
    );

    // ── 3. orders — add buyer_user_id ─────────────────────────────────────────
    const buyerUserIdColumn = await queryRunner.query(
      `SELECT udt_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'orders'
         AND column_name = 'buyer_user_id'`,
    );

    if (buyerUserIdColumn.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "orders" ADD COLUMN "buyer_user_id" uuid NULL`,
      );
    } else if (
      buyerUserIdColumn[0].udt_name !== 'uuid' ||
      buyerUserIdColumn[0].is_nullable !== 'YES'
    ) {
      throw new Error(
        'Existing orders.buyer_user_id must be a nullable UUID column.',
      );
    }
    await queryRunner.createIndex(
      'orders',
      new TableIndex({ name: 'idx_orders_buyer_user_id', columnNames: ['buyer_user_id'] }),
    );

    // ── 4. seed default categories ────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "categories" ("name", "slug", "description") VALUES
        ('Electronics',       'electronics',       'Gadgets, devices, and accessories'),
        ('Apparel',           'apparel',            'Clothing, shoes, and fashion accessories'),
        ('Home & Kitchen',    'home-kitchen',       'Furniture, appliances, and home goods'),
        ('Sports & Outdoors', 'sports-outdoors',    'Fitness gear and outdoor equipment'),
        ('Books & Media',     'books-media',        'Books, music, and digital media')
      ON CONFLICT ("name") DO NOTHING
    `);

    // ── 5. backfill product slugs (unique via id suffix, only when NULL) ────────
    await queryRunner.query(`
      UPDATE "products"
      SET "slug" = LOWER(
        REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g')
      ) || '-' || SUBSTR(MD5("id"::text), 1, 8)
      WHERE "slug" IS NULL
    `);

    // ── 6. Skip round-robin category assignment — do not invent product classifications.
    // Products remain unclassified (NULL) unless an explicit trusted mapping is configured.
    // No automated UPDATE to products.category is performed by this migration.

    // ── 7. FK: products.category -> categories.name (dual-write name column) ──
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "fk_products_category"
      FOREIGN KEY ("category") REFERENCES "categories" ("name")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes first
    await queryRunner.dropIndex('orders', 'idx_orders_buyer_user_id');
    await queryRunner.dropIndex('products', 'idx_products_category');
    await queryRunner.dropIndex('products', 'idx_products_slug');
    await queryRunner.dropIndex('categories', 'idx_categories_slug');

    // Drop FK constraint before columns
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "fk_products_category"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "buyer_user_id"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "category"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "slug"`);

    // Drop categories table
    await queryRunner.dropTable('categories');
  }
}
