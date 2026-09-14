export class OverviewResponseDto {
  range: string;
  stats: {
    outstanding_cents: number;
    overdue_cents: number;
    paid_this_month_cents: number;
    total_customers: number;
    paid_this_month_delta_pct: number | null;
  };
  revenue_by_month: Array<{ month: string; amount_cents: number }>;
  invoice_buckets: Array<{ month: string; outstanding_cents: number; overdue_cents: number }>;
  recent_invoices: Array<{
    id: string;
    number: string;
    customer_name: string;
    status: string;
    total_cents: number;
    due_date: string;
  }>;
  recent_activity: Array<{
    type: string;
    entity_id: string;
    label: string;
    timestamp: string;
  }>;
}
