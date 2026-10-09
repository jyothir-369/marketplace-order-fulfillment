import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddWebhookEventIdempotency1717000000000 implements MigrationInterface {
  name = 'AddWebhookEventIdempotency1717000000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "webhook_events" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "event_id" varchar(255) UNIQUE NOT NULL, "event_type" varchar(32) NOT NULL, "payload_id" varchar(255), "processed_at" timestamp DEFAULT now(), "status" varchar(20) DEFAULT 'pending')`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_webhook_events_event_id" ON "webhook_events" ("event_id")`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_webhook_events_event_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_events"`);
  }
}
