import { MIGRATION_REGISTRY, DUPLICATE_TIMESTAMPS } from '../registry';

describe('Registry completeness (RED)', () => {
  it('registers all canonical migrations including date-based migrations', () => {
    expect(MIGRATION_REGISTRY.length).toBeGreaterThanOrEqual(25);
    // Date-based migration count includes the customer-address column correction.
    expect(MIGRATION_REGISTRY.filter(n => /^2026/.test(n))).toHaveLength(14);
  });

  it('preserves duplicate timestamps with distinct class names', () => {
    expect(DUPLICATE_TIMESTAMPS).toContain('1710000000005');
    expect(DUPLICATE_TIMESTAMPS).toContain('2026101300000');
  });
});
