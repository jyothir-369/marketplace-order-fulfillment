// Dashboard aggregation helpers — compute stat cards, revenue buckets, aging
// All values in integer cents. No floats.

export interface StatsResult {
  outstanding_cents: number;
  overdue_cents: number;
  paid_this_month_cents: number;
  total_customers: number;
  paid_this_month_delta_pct: number | null;
}

export interface InvoiceRecord {
  status: string;
  total_cents: number;
  due_date?: string | Date | null;
  paid_at?: string | Date | null;
  tenant_id: string;
  customer_id?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface CustomerRecord {
  tenant_id: string;
  id: string;
}

export function computeStats(
  invoices: InvoiceRecord[],
  customers: CustomerRecord[],
  previousMonthPaid: number,
): StatsResult {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const outstanding_cents = invoices
    .filter((i) => (i.status === 'SENT' || i.status === 'OVERDUE') && i.tenant_id === 'current')
    .reduce((s, i) => s + i.total_cents, 0);

  const overdue_cents = invoices
    .filter((i) => i.status === 'OVERDUE' && i.tenant_id === 'current' && i.due_date && new Date(i.due_date) < now)
    .reduce((s, i) => s + i.total_cents, 0);

  const paid_this_month_cents = invoices
    .filter(
      (i) =>
        i.status === 'PAID' &&
        i.tenant_id === 'current' &&
        i.paid_at &&
        new Date(i.paid_at) >= thisMonthStart &&
        new Date(i.paid_at) <= thisMonthEnd,
    )
    .reduce((s, i) => s + i.total_cents, 0);

  const total_customers = customers.filter((c) => c.tenant_id === 'current').length;

  let paid_this_month_delta_pct: number | null = null;
  if (previousMonthPaid === 0) {
    paid_this_month_delta_pct = null;
  } else {
    paid_this_month_delta_pct = Number((((paid_this_month_cents - previousMonthPaid) / previousMonthPaid) * 100).toFixed(1));
  }

  return {
    outstanding_cents,
    overdue_cents,
    paid_this_month_cents,
    total_customers,
    paid_this_month_delta_pct,
  };
}

export function computeRevenueByMonth(
  invoices: InvoiceRecord[],
  months: number = 6,
): Array<{ month: string; amount_cents: number }> {
  const now = new Date();
  const result: Array<{ month: string; amount_cents: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const amount_cents = invoices
      .filter(
        (inv) =>
          inv.status === 'PAID' &&
          inv.paid_at &&
          new Date(inv.paid_at) >= monthStart &&
          new Date(inv.paid_at) <= monthEnd,
      )
      .reduce((s, inv) => s + inv.total_cents, 0);
    result.push({ month: monthStr, amount_cents });
  }
  return result;
}

export function computeInvoiceBuckets(
  invoices: InvoiceRecord[],
  months: number = 6,
): Array<{ month: string; outstanding_cents: number; overdue_cents: number }> {
  const now = new Date();
  const result: Array<{ month: string; outstanding_cents: number; overdue_cents: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthInvoices = invoices.filter(
      (inv) => inv.tenant_id === 'current' && new Date(inv.created_at ?? 0) >= monthStart && new Date(inv.created_at ?? 0) <= monthEnd,
    );
    const outstanding_cents = monthInvoices
      .filter((inv) => inv.status === 'SENT' || inv.status === 'OVERDUE')
      .reduce((s, inv) => s + inv.total_cents, 0);
    const overdue_cents = monthInvoices
      .filter((inv) => inv.status === 'OVERDUE' && inv.due_date && new Date(inv.due_date) < now)
      .reduce((s, inv) => s + inv.total_cents, 0);
    result.push({ month: monthStr, outstanding_cents, overdue_cents });
  }
  return result;
}
