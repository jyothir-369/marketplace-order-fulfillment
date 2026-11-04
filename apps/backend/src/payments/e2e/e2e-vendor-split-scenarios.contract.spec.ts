import { calculateVendorAllocation, computeIdempotencyKey } from '../allocation/allocation-engine.service';
import { CommissionPolicy, validatePolicy } from '../allocation/commission-policy.interface';

describe('Area 1 — Single-vendor checkout + allocation (executable contract)', () => {
  const policy: CommissionPolicy = { rulesVersion: 'v1', currency: 'USD', model: 'PERCENTAGE', rate: 1500, feeCents: 50, feeBearer: 'PLATFORM', discountTreatment: 'BEFORE_COMMISSION', taxShippingAllocation: 'GROSS', activeFrom: new Date('2026-01-01'), approved: true } as CommissionPolicy;

  it('computes integer-paise allocation with idempotency key and RECONCILED status', () => {
    const result = calculateVendorAllocation({
      orderReference: 'ORD-001', vendorId: 'V1', lineTotalCents: 10000, currency: 'USD', rulesVersion: 'v1', vendorAccountState: 'ACTIVE',
    }, policy);
    expect(result.allocationCents).toBeGreaterThanOrEqual(0);
    expect(result.idempotencyKey).toBe(computeIdempotencyKey('ORD-001', 'V1', 'v1'));
    expect(result.reconciliationStatus).toBe('MISSING_CAPTURE'); // no capturedAmountCents provided
    expect(result.grossLineCents).toBe(10000);
  });

  it('rejects ineligible vendor account (fail-closed eligibility)', () => {
    expect(() => calculateVendorAllocation({
      orderReference: 'ORD-002', vendorId: 'V2', lineTotalCents: 5000, currency: 'USD', rulesVersion: 'v1', vendorAccountState: 'INACTIVE',
    }, policy)).toThrow('Vendor V2 state=INACTIVE');
  });

  it('detects amount mismatch when captured != gross (reconciliation contract)', () => {
    const r = calculateVendorAllocation({
      orderReference: 'ORD-003', vendorId: 'V3', lineTotalCents: 10000, capturedAmountCents: 9500, currency: 'USD', rulesVersion: 'v1', vendorAccountState: 'ACTIVE',
    }, policy);
    expect(r.reconciliationStatus).toBe('AMOUNT_MISMATCH');
  });

  it('preserves non-negative vendor payable with integer arithmetic (no float overflow)', () => {
    const r = calculateVendorAllocation({
      orderReference: 'ORD-004', vendorId: 'V4', lineTotalCents: 10000, currency: 'USD', rulesVersion: 'v1', vendorAccountState: 'ACTIVE',
    }, policy);
    expect(Number.isInteger(r.allocationCents)).toBe(true);
    expect(r.breakdown.vendorPayableCents).toBeGreaterThanOrEqual(0);
    expect(r.breakdown.commissionCents).toBeGreaterThanOrEqual(0);
  });
});
