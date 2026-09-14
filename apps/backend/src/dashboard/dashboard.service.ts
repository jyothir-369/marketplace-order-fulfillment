import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

// Minimal entity representations for dashboard aggregation
// In production these map to actual Invoice / Customer entities
export class DashboardService {
  // Stub — real implementation uses typed repositories
  async getOverview(tenantId: string, range: string): Promise<any> {
    // Return stub satisfying contract; real queries use tenantId in WHERE
    return {
      range,
      stats: {
        outstanding_cents: 0,
        overdue_cents: 0,
        paid_this_month_cents: 0,
        total_customers: 0,
        paid_this_month_delta_pct: null,
      },
      revenue_by_month: [],
      invoice_buckets: [],
      recent_invoices: [],
      recent_activity: [],
    };
  }
}
