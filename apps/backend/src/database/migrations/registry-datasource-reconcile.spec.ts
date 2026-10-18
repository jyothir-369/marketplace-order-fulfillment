import * as fs from 'fs';
import * as path from 'path';
import { MIGRATION_REGISTRY } from './registry';
import { migrationDataSource } from './datasource';

describe('Migration registry/datasource reconciliation', () => {
  it('has unique registry entries', () => {
    expect(new Set(MIGRATION_REGISTRY).size).toBe(MIGRATION_REGISTRY.length);
  });

  it('registers every registry migration in the datasource', () => {
    const registered = new Set(
      (migrationDataSource.options.migrations as unknown[]).map(
        migration => { if (typeof migration === 'function') return migration.name; if (typeof migration === 'string') return migration; throw new Error('Unexpected datasource migration entry'); },
      ),
    );

    const missing = MIGRATION_REGISTRY.filter(entry => {
      const source = fs.readFileSync(path.join(__dirname, `${entry}.ts`), 'utf8');
      const match = source.match(
        /export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/,
      );
      return !match || !registered.has(match[1]);
    });

    expect(missing).toEqual([]);
  });

  it('documents the known historical migration timestamp collisions', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DUPLICATE_TIMESTAMPS = (require("./registry") as { DUPLICATE_TIMESTAMPS: string[] }).DUPLICATE_TIMESTAMPS;

    expect(DUPLICATE_TIMESTAMPS).toEqual(
      expect.arrayContaining(['1710000000005', '2026101300000']),
    );
  });

  it('uses a 13-digit timestamp suffix for every datasource migration', () => {
    const classes = migrationDataSource.options.migrations as unknown[];
    const invalid = classes
      .map(migration => { if (typeof migration === 'function') return migration.name; if (typeof migration === 'string') return migration; throw new Error('Unexpected datasource migration entry'); })
      .filter(name => !/\d{13}$/.test(name));

    expect(invalid).toEqual([]);
  });

  it('retains all registered date-based migrations', () => {
    expect(MIGRATION_REGISTRY.filter(name => /^202610/.test(name))).toHaveLength(9);
  });
});