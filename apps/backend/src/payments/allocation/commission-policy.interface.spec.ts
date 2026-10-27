import { validatePolicy, PolicyValidationError, CommissionPolicy } from './commission-policy.interface';

describe('CommissionPolicy validation', () => {
  const base: CommissionPolicy = {
    rulesVersion: 'v2026-10-27-test',
    model: 'PERCENTAGE',
    rate: 1500, // 15.00% in basis points / paise scale for expression
    feeBearer: 'PLATFORM',
    feePaise: 50,
    discountTreatment: 'BEFORE_COMMISSION',
    taxShippingAllocation: 'GROSS',
    currency: 'INR',
    activeFrom: new Date('2026-01-01'),
    approved: true,
  };

  it('accepts complete approved PERCENTAGE policy', () => {
    const p = validatePolicy({ ...base });
    expect(p.model).toBe('PERCENTAGE');
    expect(p.approved).toBe(true);
  });

  it('accepts FIXED_AMOUNT policy', () => {
    const p = validatePolicy({ ...base, model: 'FIXED_AMOUNT', rate: 5000 });
    expect(p.model).toBe('FIXED_AMOUNT');
  });

  it('rejects missing policy (fail closed)', () => {
    expect(() => validatePolicy(null)).toThrow(PolicyValidationError);
    expect(() => validatePolicy(undefined)).toThrow(/missing/);
  });

  it('rejects missing rulesVersion / approved / model', () => {
    const bad: Partial<CommissionPolicy> = { ...base, rulesVersion: undefined, approved: undefined, model: undefined };
    expect(() => validatePolicy(bad)).toThrow(PolicyValidationError);
  });

  it('rejects unapproved policy', () => {
    expect(() => validatePolicy({ ...base, approved: false })).toThrow(/not approved/);
  });

  it('rejects unsupported model', () => {
    expect(() => validatePolicy({ ...base, model: 'UNKNOWN' as any })).toThrow(/Unsupported/);
  });

  it('rejects unsupported currency', () => {
    expect(() => validatePolicy({ ...base, currency: 'USD' })).toThrow(/Unsupported currency/);
  });

  it('rejects invalid PERCENTAGE rate (negative / >10000)', () => {
    expect(() => validatePolicy({ ...base, rate: -1 })).toThrow(/rate/);
    expect(() => validatePolicy({ ...base, rate: 10001 })).toThrow(/rate/);
  });

  it('rejects negative feePaise', () => {
    expect(() => validatePolicy({ ...base, feePaise: -10 })).toThrow(/feePaise/);
  });

  it('accepts test-only approved policy', () => {
    const p = validatePolicy({ ...base, rulesVersion: 'TEST-ONLY-20261027', approved: true });
    expect(p.rulesVersion).toBe('TEST-ONLY-20261027');
  });

  it('preserves policy version for snapshot consistency', () => {
    const p = validatePolicy({ ...base, rulesVersion: 'v2.0' });
    expect(p.rulesVersion).toBe('v2.0');
  });

  it('rejects contradictory configurations (missing rate for percentage)', () => {
    const p: Partial<CommissionPolicy> = { ...base, model: 'PERCENTAGE', rate: undefined };
    expect(() => validatePolicy(p)).toThrow(/rate/);
  });
});
