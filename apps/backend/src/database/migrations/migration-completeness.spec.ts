import * as fs from 'fs';
import * as path from 'path';
import { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS } from './registry';
import { MIGRATION_CLASSES } from './migration-classes';

describe('migration completeness', () => {
  const dir = __dirname;

  function migrationClassFromFile(filePath: string): string {
    const source = fs.readFileSync(filePath, 'utf8');
    const match = source.match(
      /export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/,
    );

    if (!match) {
      throw new Error(`No MigrationInterface class found in ${path.basename(filePath)}`);
    }

    return match[1];
  }

  function datasourceMigrationClasses(): string[] {
    const configured = MIGRATION_CLASSES;
    if (!Array.isArray(configured)) {
      throw new Error('Expected datasource migrations to be an array');
    }

    return configured.map((migration, index) => {
      if (typeof migration !== 'function') {
        throw new Error(`Unexpected datasource migration at index ${index}`);
      }
      return migration.name;
    });
  }

  it('every timestamp-prefixed migration file is registered by exact basename', () => {
    const migrationFiles = fs.readdirSync(dir).filter((file) => {
      if (!file.endsWith('.ts')) return false;
      if (file.includes('.spec.') || file.includes('.test.')) return false;
      if (file.includes('.bak') || file.includes('.backup') || file.includes('.orig')) return false;
      return /^\d+.*\.ts$/.test(file);
    });

    const registered = new Set(MIGRATION_REGISTRY);
    const missing = migrationFiles
      .map((file) => file.replace(/\.ts$/, ''))
      .filter((basename) => !registered.has(basename));

    expect(missing).toEqual([]);
  });

  it('every registry entry has exactly the expected migration file and class', () => {
    const duplicateEntries = MIGRATION_REGISTRY.filter(
      (entry, index) => MIGRATION_REGISTRY.indexOf(entry) !== index,
    );
    expect(duplicateEntries).toEqual([]);

    for (const entry of MIGRATION_REGISTRY) {
      const filePath = path.join(dir, `${entry}.ts`);
      expect(fs.existsSync(filePath)).toBe(true);

      if (fs.existsSync(filePath)) {
        expect(migrationClassFromFile(filePath)).toMatch(/\d{13}$/);
      }
    }
  });

  it('datasource migration classes match registry classes exactly', () => {
    const expected = MIGRATION_REGISTRY.map((entry) =>
      migrationClassFromFile(path.join(dir, `${entry}.ts`)),
    );
    const actual = datasourceMigrationClasses();

    // Historical migrations can have a deliberate datasource order that differs
    // from registry presentation order. Verify exact membership without reordering
    // migration execution history.
    expect(new Set(actual).size).toBe(actual.length);
    expect(actual.length).toBe(expected.length);
    expect([...actual].sort()).toEqual([...expected].sort());
  });

  it('preserves the documented duplicate timestamp allowlist', () => {
    expect(DUPLICATE_TIMESTAMPS).toEqual(
      expect.arrayContaining(['1710000000005', '2026101300000']),
    );

    const counts = new Map<string, number>();
    for (const entry of MIGRATION_REGISTRY) {
      const className = migrationClassFromFile(path.join(dir, `${entry}.ts`));
      const timestamp = className.slice(-13);
      counts.set(timestamp, (counts.get(timestamp) ?? 0) + 1);
    }

    const collisions = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([timestamp]) => timestamp)
      .sort();

    expect(collisions).toEqual([...DUPLICATE_TIMESTAMPS].sort());
  });

  it('includes the promotions migration in registry and datasource', () => {
    expect(MIGRATION_REGISTRY).toContain('20261017-AddPromotionsTable');
    expect(datasourceMigrationClasses()).toContain('AddPromotionsTable2026101700000');
    expect(
      fs.existsSync(path.join(dir, '20261017-AddPromotionsTable.ts')),
    ).toBe(true);
  });

  it('includes 20261027-AddVendorPaymentAccounts in registry and datasource with 13-digit class', () => {
    expect(MIGRATION_REGISTRY).toContain('20261027-AddVendorPaymentAccounts');
    expect(datasourceMigrationClasses()).toContain('AddVendorPaymentAccounts2026102700000');
    expect(
      fs.existsSync(path.join(dir, '20261027-AddVendorPaymentAccounts.ts')),
    ).toBe(true);
  });

  it('fails when registry and datasource migration sets differ', () => {
    const registered = new Set(
      (MIGRATION_CLASSES as unknown[]).map(
        migration => { if (typeof migration === 'function') return migration.name; if (typeof migration === 'string') return migration; throw new Error('Unexpected datasource migration entry'); },
      ),
    );
    const expected = MIGRATION_REGISTRY.map((entry) => {
      const filePath = path.join(dir, entry + '.ts');
      const source = fs.readFileSync(filePath, 'utf8');
      const match = source.match(/export\s+class\s+([A-Za-z_$][\w$]*)\s+implements\s+MigrationInterface/);
      if (!match) throw new Error('No class for ' + entry);
      return match[1];
    });
    const missingInDatasource = expected.filter(c => !registered.has(c));
    expect(missingInDatasource).toEqual([]);
  });
});