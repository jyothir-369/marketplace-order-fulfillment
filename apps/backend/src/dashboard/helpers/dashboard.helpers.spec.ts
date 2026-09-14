import { computeStats, computeRevenueByMonth, computeInvoiceBuckets } from './dashboard.helpers';

describe('computeStats', () => {
  it('returns 0 for no invoices', () => {
    const result = computeStats([], [], 0);
    expect(result.outstanding_cents).toBe(0);
    expect(result.overdue_cents).toBe(0);
    expect(result.paid_this_month_cents).toBe(0);
    expect(result.total_customers).toBe(0);
    expect(result.paid_this_month_delta_pct).toBe(null);
  });

  it('only overdue invoices', () => {
    const invoices = [
      { status: 'OVERDUE', total_cents: 20000, due_date: '2020-01-01', tenant_id: 'current', paid_at: null },
    ];
    const result = computeStats(invoices, [], 0);
    expect(result.overdue_cents).toBe(20000);
  });

  it('paid delta null when previous month = 0', () => {
    const result = computeStats(
      [{ status: 'PAID', total_cents: 10000, paid_at: new Date().toISOString(), tenant_id: 'current' }],
      [{ id: '1', tenant_id: 'current' }],
      0,
    );
    expect(result.paid_this_month_delta_pct).toBeNull();
  });

  it('paid delta normal case', () => {
    const result = computeStats(
      [{ status: 'PAID', total_cents: 12000, paid_at: new Date().toISOString(), tenant_id: 'current' }],
      [],
      10000,
    );
    expect(result.paid_this_month_delta_pct).toBe(20.0);
  });
});

describe('computeRevenueByMonth', () => {
  it('returns 6 months with 0 when sparse', () => {
    const result = computeRevenueByMonth([]);
    expect(result.length).toBe(6);
    expect(result.every((r) => r.amount_cents === 0)).toBe(true);
  });
});

describe('computeInvoiceBuckets', () => {
  it('returns 6 months', () => {
    const result = computeInvoiceBuckets([]);
    expect(result.length).toBe(6);
  });
});
