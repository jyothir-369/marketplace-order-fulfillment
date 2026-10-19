import { MIGRATION_REGISTRY } from './registry';
import { migrationDataSource } from './datasource';

describe('Migration registry/datasource reconciliation', () => {
  it('registry and datasource both contain duplicate 1710000000005 entries (left unresolved)', () => {
    const reg171 = MIGRATION_REGISTRY.filter(n => n.includes('1710000000005'));
    expect(reg171.length).toBe(2); // preserved without blind rename
  });

  it('datasource imports both 20261013 migrations with same suffix (collision preserved)', () => {
    const migrations = migrationDataSource.options.migrations as any[];
    const names = migrations.map(m => m.name || m.constructor?.name || 'unknown');
    const count2026 = names.filter((n: string) => n.includes('20261013')).length;
    expect(count2026).toBeGreaterThanOrEqual(2); // both preserved
  });

  it('date-only migrations kept (not renamed blindly)', () => {
    const dateOnly = MIGRATION_REGISTRY.filter(n => /^202610/.test(n));
    expect(dateOnly.length).toBeGreaterThanOrEqual(7);
  });
});
