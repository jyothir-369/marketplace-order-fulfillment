/**
 * Admin customers — Phase 11 (live paginated API + search + authorization).
 */
"use client";
import { useEffect, useState } from "react";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { getAdminCustomers } from "@/lib/api";
import type { CustomerDto } from "@/lib/types";

interface CustomersResponse { total: number; customers: CustomerDto[] }

export default function AdminCustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const d = await getAdminCustomers({ limit, offset, search });
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [offset]);
  useEffect(() => { setOffset(0); }, [search]);

  if (loading && !data) return <div className="flex h-64 items-center justify-center text-sm text-[var(--color-muted-foreground)]">Loading customers...</div>;
  if (error || !data) return (
    <div className="flex h-64 flex-col items-center justify-center gap-3">
      <span className="text-sm text-[var(--color-destructive)]">{error ?? "Failed to load"}</span>
      <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs text-[var(--color-foreground)] hover:bg-[var(--color-accent)]">Retry</button>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-[var(--color-brass)]" /> Customers</h1>
      <div className="flex gap-2">
        <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder="Search by email or buyer id..." className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm" />
        <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-accent)]">Refresh</button>
      </div>
      {data.total > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr><th className="text-left px-3 py-2">Email / ID</th><th className="text-right px-3 py-2">Orders</th><th className="text-right px-3 py-2">Spend</th></tr>
          </thead>
          <tbody>
            {data.customers.map((c: CustomerDto) => (
              <tr key={c.buyerId} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 font-mono text-xs">{c.email || c.buyerId}</td>
                <td className="text-right px-3 py-2">{c.orderCount}</td>
                <td className="text-right px-3 py-2">{(c.totalSpend ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-[var(--color-muted-foreground)]">No customers found. Try a different search or refresh.</p>
      )}
      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="inline-flex items-center gap-1 disabled:opacity-40">Previous</button>
        <span>{data.total} customers · showing {Math.min(offset + 1, data.total)}-{Math.min(offset + limit, data.total)}</span>
        <button disabled={offset + limit >= data.total} onClick={() => setOffset(offset + limit)} className="inline-flex items-center gap-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
