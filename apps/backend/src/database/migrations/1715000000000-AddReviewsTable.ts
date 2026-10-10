import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewsTable1715000000000 implements MigrationInterface {
  name = 'AddReviewsTable1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "buyer_id" uuid NOT NULL,
        "rating" int NOT NULL,
        "comment" varchar(2000),
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_reviews_product_buyer" UNIQUE ("product_id", "buyer_id"),
        CONSTRAINT "FK_reviews_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_reviews_product" ON "reviews" ("product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reviews_product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
  }
}
