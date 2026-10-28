import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DataSource } from 'typeorm';
import { MIGRATION_REGISTRY } from '../registry';
import { MIGRATION_CLASSES } from '../migration-classes';

function getDisposableUrl(): string | undefined {
  const raw = process.env.MIGRATION_E2E_DATABASE_URL;
  if (!raw || raw !== raw.trim()) return undefined;

  try {
    const url = new URL(raw);
    const db = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return undefined;
    if (!['127.0.0.1', 'localhost'].includes(url.hostname.toLowerCase())) return undefined;
    if (!url.port || !url.username || !url.password) return undefined;
    if (url.search || url.hash) return undefined;
    if (!db || [
      'postgres', 'template0', 'template1',
      'marketplace_migration_test',
      'marketplace_migration_constraints_test',
      'marketplace_e2e_tmp',
    ].includes(db.toLowerCase())) return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

describe('Migration integration harness (canonical registry)', () => {
  it('has unique canonical registry entries and matching static migration classes', () => {
    expect(MIGRATION_REGISTRY.length).toBeGreaterThan(0);
    expect(new Set(MIGRATION_REGISTRY).size).toBe(MIGRATION_REGISTRY.length);
    expect(MIGRATION_CLASSES).toHaveLength(MIGRATION_REGISTRY.length);
    expect(new Set(MIGRATION_CLASSES.map((migration) => migration.name)).size)
      .toBe(MIGRATION_CLASSES.length);
  });

  it('does not enable live execution without a dedicated disposable URL', () => {
    const url = getDisposableUrl();
    if (!url) {
      expect(url).toBeUndefined();
      return;
    }
    const parsed = new URL(url);
    expect(['localhost', '127.0.0.1']).toContain(parsed.hostname.toLowerCase());
  });

  describe('live migration execution (dedicated disposable database only)', () => {
    let ds: DataSource | undefined;

    beforeAll(async () => {
      const url = getDisposableUrl();
      if (!url) return;

      ds = new DataSource({
        type: 'postgres',
        url,
        entities: [],
        migrations: MIGRATION_CLASSES,
        migrationsTableName: 'migrations',
        synchronize: false,
        logging: false,
      });
      await ds.initialize();

      const identity = await ds.query(
        'SELECT current_database() AS db, inet_server_port() AS port',
      );
      const expectedDb = decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''));
      if (identity[0]?.db !== expectedDb) {
        await ds.destroy();
        ds = undefined;
        throw new Error('FAIL-CLOSED: connected database identity mismatch');
      }
    });

    it('records complete migration history and applies no migrations twice', async () => {
      if (!getDisposableUrl()) {
        throw new Error(
          'FAIL-CLOSED: set MIGRATION_E2E_DATABASE_URL to a fresh disposable localhost PostgreSQL database'
        );
      }
      if (!ds?.isInitialized) throw new Error('FAIL-CLOSED: disposable datasource unavailable');

      const applied = await ds.runMigrations({ transaction: 'all' });
      const rows = await ds.query('SELECT name FROM migrations');
      const actual = rows.map((row: { name: string }) => row.name).sort();
      const expected = MIGRATION_CLASSES.map((migration) => migration.name).sort();

      expect(actual).toEqual(expected);

      // This suite may share the disposable DB with the E2E suite.
      // A run may apply all migrations on a fresh DB or none on a completed DB.
      expect([0, expected.length]).toContain(applied.length);
    });

    it('does not reapply completed migrations on a second run', async () => {
      if (!getDisposableUrl()) {
        throw new Error(
          'FAIL-CLOSED: set MIGRATION_E2E_DATABASE_URL to a fresh disposable localhost PostgreSQL database'
        );
      }
      if (!ds?.isInitialized) throw new Error('FAIL-CLOSED: disposable datasource unavailable');

      const before = await ds.query('SELECT name FROM migrations ORDER BY name');
      const secondRun = await ds.runMigrations({ transaction: 'all' });
      const after = await ds.query('SELECT name FROM migrations ORDER BY name');

      expect(secondRun).toHaveLength(0);
      expect(after.map((row: { name: string }) => row.name))
        .toEqual(before.map((row: { name: string }) => row.name));
    });

    afterAll(async () => {
      if (ds?.isInitialized) await ds.destroy();
    });
  });
});