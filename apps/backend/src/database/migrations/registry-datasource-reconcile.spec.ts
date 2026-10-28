import * as fs from 'fs';
import * as path from 'path';
import { MIGRATION_REGISTRY } from './registry';
import { MIGRATION_CLASSES } from './migration-classes';

describe('Migration registry/datasource reconciliation', () => {
  it('has unique registry entries', () => {
    expect(new Set(MIGRATION_REGISTRY).size).toBe(MIGRATION_REGISTRY.length);
  });

  it('registers every registry migration in the datasource', () => {
    const registered = new Set(
      MIGRATION_CLASSES.map((migration) => {
        if (typeof migration === 'function') return (migration as { name?: string }).name || '';
        if (typeof migration === 'string') return migration;
        throw new Error('Unexpected datasource migration entry');
      }).filter((n: string) => !!n),
    );

    const missing = MIGRATION_REGISTRY.filter((entry) => {
      const source = fs.readFileSync(path.join(__dirname, `${entry}.ts`), 'utf8');
      const match = source.match(
        /export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/,
      );
      return !match || !registered.has(match[1]);
    });

    expect(missing).toEqual([]);
  });

  it('documents the known historical migration timestamp collisions', () => {
    const DUPLICATE_TIMESTAMPS = (require("./registry") as { DUPLICATE_TIMESTAMPS: string[] }).DUPLICATE_TIMESTAMPS;
    expect(DUPLICATE_TIMESTAMPS).toEqual(
      expect.arrayContaining(['1710000000005', '2026101300000']),
    );
  });

  it('uses a 13-digit timestamp suffix for every datasource migration', () => {
    const classes = MIGRATION_CLASSES.map((migration: unknown) => {
      if (typeof migration === 'function') return (migration as { name: string }).name;
      if (typeof migration === 'string') return migration;
      throw new Error('Unexpected datasource migration entry');
    }) as string[];
    const invalid = classes.filter((name) => !/\d{13}$/.test(name));
    expect(invalid).toEqual([]);
  });

  it('retains all registered date-based migrations (10, including 20261027)', () => {
    expect(MIGRATION_REGISTRY.filter((name) => /^2026/.test(name))).toHaveLength(10);
  });

  it('fails for unregistered migration files (nonzero on missing registry)', () => {
    const dir = __dirname;
    const allFiles = fs.readdirSync(dir).filter(
      (f) => /^\d+.*\.ts$/.test(f) && !f.includes('.spec.') && !f.includes('.test.') && !f.includes('.bak') && !f.includes('.backup'),
    );
    const registeredBasenames = new Set(MIGRATION_REGISTRY);
    const unregistered = allFiles.map((f) => f.replace(/\.ts$/, '')).filter((b) => !registeredBasenames.has(b));
    // After repair, 20261027 must be registered; this test asserts zero unregistered.
    expect(unregistered).toEqual([]);
  });

  it('requires datasource to include 20261027 with 13-digit class suffix', () => {
    const classes: string[] = MIGRATION_CLASSES.map((migration: unknown) => {
      if (typeof migration === 'function') return (migration as { name: string }).name;
      if (typeof migration === 'string') return migration;
      throw new Error('Unexpected datasource migration entry');
    });
    expect(classes).toContain('AddVendorPaymentAccounts2026102700000');
  });

  it('fails safely when datasource factory invoked without valid isolated DB config', () => {
    const names = [
      'MIGRATION_TEST_DATABASE_URL',
      'MIGRATION_TEST_DB_HOST',
      'MIGRATION_TEST_DB_PORT',
      'MIGRATION_TEST_DB_USERNAME',
      'MIGRATION_TEST_DB_PASSWORD',
      'DATABASE_URL',
      'DB_HOST',
      'DB_PORT',
      'DB_DATABASE',
      'DB_USERNAME',
      'DB_PASSWORD',
    ];

    const original = new Map<string, string | undefined>(
      names.map((name) => [name, process.env[name]]),
    );

    try {
      for (const name of names) {
        delete process.env[name];
      }

      jest.resetModules();

      const { getMigrationDataSourceLazy } = require('./datasource');
      expect(() => getMigrationDataSourceLazy()).toThrow(
        /MIGRATION_TEST_DATABASE_URL|FAIL-CLOSED/i,
      );
    } finally {
      for (const [name, value] of original) {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      }

      jest.resetModules();
    }
  });
});
