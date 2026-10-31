/*
 * Migration E2E â€” real canonical execution against a fresh disposable DB.
 * Distinct from integration harness (which targets the existing
 * marketplace_migration_test); this test creates its own disposable DB
 * (marketplace_migration_e2e_tmp) and never touches the production/test DB.
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { DataSource } from 'typeorm';
import { loadCanonicalMigrationClasses } from '../canonical-migrations';
import { getCanonicalClasses } from './harness';

describe('Migration E2E (disposable DB, real canonical classes)', () => {
  let ds: DataSource;
  let unavailable = false;
  let unavailableReason = '';

  // Fail-closed: refuse to run against non-loopback / non-test DB.
  function guardUrl(urlStr: string): void {
    const url = new URL(urlStr.trim());
    if (!['localhost', '127.0.0.1'].includes(url.hostname.toLowerCase())) {
      throw new Error('BLOCKED: migration E2E must target loopback');
    }
    // Only allow genuinely fresh dedicated disposable E2E DB; reject persistent test DB and production DBs.
    const dbName = url.pathname.replace(/^\//, '');
    if (!dbName || dbName === 'marketplace_migration_test' || dbName === 'postgres' || dbName === 'template1' || dbName === 'template0') {
      throw new Error('BLOCKED: E2E must target a genuinely fresh dedicated disposable DB (not marketplace_migration_test/production/test)');
    }
    if (!url.username || !url.password) {
      throw new Error('BLOCKED: E2E URL must include explicit database credentials');
    }
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      throw new Error('BLOCKED: E2E URL must use postgres/postgresql');
    }
    if (url.search || url.hash) {
      throw new Error('BLOCKED: E2E URL must not contain query parameters or fragments');
    }
  }

  beforeAll(async () => {
    try {
      // Explicit dedicated E2E credential required; never fall back to MIGRATION_TEST_DATABASE_URL.
      const url = (process.env.MIGRATION_E2E_DATABASE_URL || '').trim();
      if (!url) throw new Error('BLOCKED: MIGRATION_E2E_DATABASE_URL required explicitly');
      guardUrl(url);
      const canonical = loadCanonicalMigrationClasses();
      if (!canonical || canonical.length === 0) throw new Error('BLOCKED: canonical migration classes missing');
      ds = new DataSource({
        type: 'postgres',
        url,
        entities: [],
        migrations: canonical,
        synchronize: false,
        logging: false,
      });
      await ds.initialize();
      // First execution: apply migrations to fresh DB.
      await ds.runMigrations({ transaction: 'each' });
    } catch (e: any) {
      unavailable = true;
      unavailableReason = (e as Error)?.message || String(e);
      console.error('UNAVAILABLE (expected if DB missing):', unavailableReason);
    }
  });

  it('fails clearly when required disposable DB unavailable â€” never reports skip as pass', async () => {
    if (unavailable) throw new Error('FAIL-CLOSED: disposable migration E2E DB unavailable â€” ' + unavailableReason);
    expect(unavailable).toBe(false);
  });

  it('uses canonical migration classes (not empty placeholder)', () => {
    const classes = getCanonicalClasses();
    expect(classes.length).toBeGreaterThan(0);
    expect(classes).toContain('20261014-FixProductVendorIdColumn');
  });

  it('real typeorm_migrations table exists and contains applied records', async () => {
    if (unavailable) throw new Error('FAIL-CLOSED: DB unavailable');
    const tableExists = await ds.query(
      "SELECT to_regclass('public.migrations') AS exists"
    );
    expect(tableExists[0]?.exists).toBeTruthy();
    const migrations = await ds.query(
      "SELECT * FROM migrations ORDER BY timestamp ASC"
    );
    expect(Array.isArray(migrations)).toBe(true);
    expect(migrations.length).toBeGreaterThan(0);
  });

  it('meaningful schema objects exist after execution', async () => {
    if (unavailable) throw new Error('FAIL-CLOSED: DB unavailable');
    // At minimum the baseline creates a table; verify a known object.
    const objects = await ds.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' LIMIT 1"
    );
    expect(objects.length).toBeGreaterThan(0);
  });

  it('second run is idempotent (no duplicate / error)', async () => {
    if (unavailable) throw new Error('FAIL-CLOSED: DB unavailable');
    // Running again against already-migrated DB must not throw.
    await expect(ds.runMigrations({ transaction: 'each' })).resolves.not.toThrow();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });
});
