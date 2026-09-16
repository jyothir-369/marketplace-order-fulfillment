import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2.1 — Baseline schema.
 *
 * The original 0001–0005 migrations only `ALTER TABLE` tables that no migration
 * ever `CREATE`s, so `migration:run` on an empty database failed. This baseline
 * creates the CORE tables implied by the entities as of before 0001 ran:
 *
 *   vendors, products, orders, order_line_items, vendor_sync_jobs, audit_logs
 *
 * Everything 0001–0005 add on top (shipping_address, order_number,
 * buyer_user_id, slug/category, categories, users, refresh_tokens) is NOT here,
 * so replaying 0000 → 0005 in order reproduces the full synchronize:true shape.
 * Entity-declared indexes live in migration 0006 so they can be added
 * idempotently on both fresh and pre-existing databases.
 *
 * Enums are named `<table>_<column>_enum` to match what synchronize produces.
 */
export class Baseline0000000000000 implements MigrationInterface {
  name = 'Baseline0000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── enum consts duplicated from the entity enums ─────────────────────
    const orderStatuses = "'placed','confirmed','fulfilling','fulfilled','cancelled'";
    const fulfillmentStatuses = "'pending','syncing','confirmed','failed','dead_letter','ambiguous'";
    const syncJobStatuses = "'pending','in_progress','completed','failed','ambiguous','dead_letter'";
    const auditActions =
      "'INVENTORY_DECREMENT','INVENTORY_RESTORE','ORDER_CREATED','ORDER_STATUS_CHANGED','FULFILLMENT_STATUS_CHANGED','SYNC_JOB_CREATED','SYNC_JOB_STATUS_CHANGED','SYNC_JOB_RETRIED','SYNC_JOB_DEAD_LETTER','ADMIN_RESOLUTION','ADMIN_ORDER_CANCEL','ADMIN_DEAD_LETTER_RETRY','RECONCILIATION_RESOLVED','RECONCILIATION_FAILED'";
    const auditEntityTypes = "'PRODUCT','ORDER','ORDER_LINE_ITEM','VENDOR_SYNC_JOB'";

    for (const { name, values } of [
      { name: 'orders_status_enum', values: orderStatuses },
      { name: 'order_line_items_fulfillment_status_enum', values: fulfillmentStatuses },
      { name: 'vendor_sync_jobs_status_enum', values: syncJobStatuses },
      { name: 'audit_logs_action_enum', values: auditActions },
      { name: 'audit_logs_entity_type_enum', values: auditEntityTypes },
    ]) {
      await queryRunner.query(`DO $$ BEGIN CREATE TYPE "${name}" AS ENUM (${values}); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    }

    // ── vendors ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "PK_vendors" PRIMARY KEY ("id")
      )
    `);

    // ── products ─────────────────────────────────────────────────────────
    // Pre-0005 state: no slug/category yet (0005 adds them). The FK to
    // vendors is added in 0006 (Phase 2.4). `vendorId` is still camelCase —
    // 0006 renames it to `vendor_id`.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "vendorId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "stock_count" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "version" integer NOT NULL DEFAULT 1,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id")
      )
    `);

    // ── orders ───────────────────────────────────────────────────────────
    // Pre-0001/0003/0005 state: no shipping_address / order_number / buyer_user_id.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "buyer_id" uuid NOT NULL,
        "status" "orders_status_enum" NOT NULL DEFAULT 'placed',
        "totalAmount" numeric(12,2) NOT NULL DEFAULT 0,
        "correlation_id" character varying(100),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id")
      )
    `);

    // ── order_line_items ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_line_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "vendor_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "unitPrice" numeric(10,2) NOT NULL,
        "lineTotal" numeric(12,2) NOT NULL,
        "fulfillment_status" "order_line_items_fulfillment_status_enum" NOT NULL DEFAULT 'pending',
        "vendor_reference" character varying(100),
        "failure_reason" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "PK_order_line_items" PRIMARY KEY ("id")
      )
    `);

    // ── vendor_sync_jobs ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_sync_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_line_item_id" uuid NOT NULL,
        "status" "vendor_sync_jobs_status_enum" NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "max_attempts" integer NOT NULL DEFAULT 5,
        "last_attempted_at" timestamp,
        "completed_at" timestamp,
        "vendor_response" character varying(255),
        "error_message" text,
        "correlation_id" character varying(100),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "PK_vendor_sync_jobs" PRIMARY KEY ("id")
      )
    `);

    // ── audit_logs ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "correlation_id" character varying(100) NOT NULL,
        "action" "audit_logs_action_enum" NOT NULL,
        "entity_type" "audit_logs_entity_type_enum" NOT NULL,
        "entity_id" uuid NOT NULL,
        "previous_state" jsonb,
        "new_state" jsonb,
        "user_id" character varying(255),
        "message" character varying(500),
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // ── relational FKs present in the entities today (not re-added later) ──
    // Products -> vendors is deliberately excluded (added in 0006).
    const fks: Array<[string, string, string, string]> = [
      ['order_line_items', 'order_id', 'orders', 'id'],
      ['order_line_items', 'product_id', 'products', 'id'],
      ['order_line_items', 'vendor_id', 'vendors', 'id'],
      ['vendor_sync_jobs', 'order_line_item_id', 'order_line_items', 'id'],
    ];
    for (const [table, column, refTable, refColumn] of fks) {
      const name = `fk_${table}_${column}`;
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
            ALTER TABLE "${table}" ADD CONSTRAINT "${name}"
              FOREIGN KEY ("${column}") REFERENCES "${refTable}"("${refColumn}");
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_sync_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_line_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendors"`);

    for (const type of [
      'audit_logs_entity_type_enum',
      'audit_logs_action_enum',
      'vendor_sync_jobs_status_enum',
      'order_line_items_fulfillment_status_enum',
      'orders_status_enum',
    ]) {
      await queryRunner.query(`DROP TYPE IF EXISTS "${type}"`);
    }
  }
}