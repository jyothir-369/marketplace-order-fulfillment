/*
 * Category 3A: canonical existing-schema migration integration.
 * Category 3B: real TypeORM failure, transaction rollback, retry and idempotency.
 * Requires MIGRATION_TEST_DATABASE_URL pointing to an isolated local disposable DB.
 * Does not modify the canonical migration registry for the Category 3B test.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DataSource, MigrationInterface, QueryRunner } from 'typeorm';
import { loadCanonicalMigrationClasses } from '../canonical-migrations';

function validatedDisposableUrl(): { url: string; database: string } {
  const raw = process.env.MIGRATION_TEST_DATABASE_URL;
  if (!raw) {
    throw new Error('BLOCKED: MIGRATION_TEST_DATABASE_URL is required.');
  }

  const u = new URL(raw);
  const database = u.pathname.replace(/^\//, '');

  if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') {
    throw new Error('BLOCKED: only PostgreSQL is permitted.');
  }
  if (u.hostname !== '127.0.0.1') {
    throw new Error('BLOCKED: database host must be 127.0.0.1.');
  }
  if (!/^\d+$/.test(u.port) || ['5432', '55439', '55440'].includes(u.port)) {
    throw new Error('BLOCKED: database port is shared or protected.');
  }
  if (!/^cat3verify_\d{14}$/.test(database)) {
    throw new Error('BLOCKED: database name is not an approved disposable name.');
  }
  if (u.search || u.hash) {
    throw new Error('BLOCKED: URL query parameters and fragments are forbidden.');
  }

  return { url: raw, database };
}

describe('Category 3A: existing-schema upgrade (disposable DB)', () => {
  let ds: DataSource | undefined;
  let database: string;

  beforeAll(async () => {
    const target = validatedDisposableUrl();
    database = target.database;
    ds = new DataSource({
      type: 'postgres',
      url: target.url,
      entities: [],
      migrations: loadCanonicalMigrationClasses(),
      migrationsTableName: 'migrations',
      synchronize: false,
      logging: false,
    });
    await ds.initialize();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('verifies disposable DB identity', async () => {
    const r = await ds!.query('SELECT current_database() AS db');
    expect(r[0].db).toBe(database);
  });

  it('applies canonical chain to the disposable schema', async () => {
    await ds!.runMigrations({ transaction: 'each' });
    const history = await ds!.query('SELECT name FROM migrations');
    expect(history.length).toBeGreaterThan(0);
  });

  it('second run is idempotent (zero reapplied)', async () => {
    const applied = await ds!.runMigrations({ transaction: 'each' });
    expect(applied).toHaveLength(0);
  });
});

let cat3bShouldFail = true;
let cat3bFirstEffectTable = '';
let cat3bFailedEffectTable = '';

class Cat3bFirstMigration1890000000000 implements MigrationInterface {
  name = 'Cat3bFirstMigration1890000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "${cat3bFirstEffectTable}" (
        id integer PRIMARY KEY,
        marker text NOT NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO "${cat3bFirstEffectTable}" (id, marker)
      VALUES (1, 'first-migration-committed')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "${cat3bFirstEffectTable}"`);
  }
}

class Cat3bFailingMigration1890000000001 implements MigrationInterface {
  name = 'Cat3bFailingMigration1890000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "${cat3bFailedEffectTable}" (
        id integer PRIMARY KEY,
        marker text NOT NULL
      )
    `);

    if (cat3bShouldFail) {
      throw new Error('CAT3B_INTENTIONAL_FAILURE');
    }

    await queryRunner.query(`
      INSERT INTO "${cat3bFailedEffectTable}" (id, marker)
      VALUES (1, 'retry-succeeded')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "${cat3bFailedEffectTable}"`);
  }
}

describe('Category 3B: real TypeORM failure, rollback and retry', () => {
  let ds: DataSource | undefined;
  let cat3bMigrationsTable = '';

  beforeAll(async () => {
    const target = validatedDisposableUrl();
    cat3bShouldFail = true;
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    cat3bMigrationsTable = `cat3b_migrations_${suffix}`;
    cat3bFirstEffectTable = `cat3b_first_effect_${suffix}`;
    cat3bFailedEffectTable = `cat3b_failed_effect_${suffix}`;

    ds = new DataSource({
      type: 'postgres',
      url: target.url,
      entities: [],
      migrations: [
        Cat3bFirstMigration1890000000000,
        Cat3bFailingMigration1890000000001,
      ],
      migrationsTableName: cat3bMigrationsTable,
      synchronize: false,
      logging: false,
    });

    await ds.initialize();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('rolls back the failed migration, retries it, and becomes idempotent', async () => {
    // Migration 1 commits. Migration 2 deliberately fails inside its own transaction.
    await expect(
      ds!.runMigrations({ transaction: 'each' }),
    ).rejects.toThrow('CAT3B_INTENTIONAL_FAILURE');

    // The completed first migration must remain committed.
    const first = await ds!.query(
      `SELECT marker FROM "${cat3bFirstEffectTable}" WHERE id = 1`,
    );
    expect(first).toEqual([{ marker: 'first-migration-committed' }]);

    const failedTable = await ds!.query(
      `SELECT to_regclass('public."${cat3bFailedEffectTable}"') AS name`,
    );
    expect(failedTable[0].name).toBeNull();

    const historyAfterFailure = await ds!.query(
      `SELECT name FROM "${cat3bMigrationsTable}" ORDER BY timestamp`,
    );
    expect(historyAfterFailure.map((r: { name: string }) => r.name)).toEqual([
      'Cat3bFirstMigration1890000000000',
    ]);

    // Repair the test-only failure condition and rerun the actual TypeORM runner.
    cat3bShouldFail = false;
    const retried = await ds!.runMigrations({ transaction: 'each' });
    expect(retried.map((m) => m.name)).toEqual([
      'Cat3bFailingMigration1890000000001',
    ]);

    const second = await ds!.query(
      `SELECT marker FROM "${cat3bFailedEffectTable}" WHERE id = 1`,
    );
    expect(second).toEqual([{ marker: 'retry-succeeded' }]);

    const historyAfterRetry = await ds!.query(
      `SELECT name FROM "${cat3bMigrationsTable}" ORDER BY timestamp`,
    );
    expect(historyAfterRetry.map((r: { name: string }) => r.name)).toEqual([
      'Cat3bFirstMigration1890000000000',
      'Cat3bFailingMigration1890000000001',
    ]);

    // A third execution must apply no migrations.
    const thirdRun = await ds!.runMigrations({ transaction: 'each' });
    expect(thirdRun).toHaveLength(0);
  });
});


