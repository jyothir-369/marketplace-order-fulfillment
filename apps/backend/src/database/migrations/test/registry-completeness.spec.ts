import { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS } from '../registry';

describe('Registry completeness (RED)', () => {
  it('registers all 25 migrations including additional six', () => {
    expect(MIGRATION_REGISTRY.length).toBeGreaterThanOrEqual(25);
    expect(MIGRATION_REGISTRY.filter(n => /^2026/.test(n))).toHaveLength(8);
  });

  it('preserves duplicate timestamps with distinct class names', () => {
    expect(DUPLICATE_TIMESTAMPS).toContain('1710000000005');
    expect(DUPLICATE_TIMESTAMPS).toContain('2026101300000');
  });
});
