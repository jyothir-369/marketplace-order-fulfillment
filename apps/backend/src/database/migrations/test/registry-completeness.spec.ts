import { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS } from '../registry';

describe('Registry completeness (RED)', () => {
  it('registers all canonical migrations including date-based migrations', () => {
    expect(MIGRATION_REGISTRY.length).toBeGreaterThanOrEqual(25);
    // 20261027-AddVendorPaymentAccounts is canonical (verified in registry + file + datasource array); total 10.
    expect(MIGRATION_REGISTRY.filter(n => /^2026/.test(n))).toHaveLength(13);
  });

  it('preserves duplicate timestamps with distinct class names', () => {
    expect(DUPLICATE_TIMESTAMPS).toContain('1710000000005');
    expect(DUPLICATE_TIMESTAMPS).toContain('2026101300000');
  });
});


