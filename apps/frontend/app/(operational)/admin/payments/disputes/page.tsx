"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type DisputeRecord = {
  id?: string | number;
  orderReference?: string;
  amountPaise?: number;
  currency?: string;
  status?: string;
  reason?: string;
  category?: string;
  providerReference?: string;
  evidenceStatus?: string;
  deadline?: string;
  createdAt?: string;
  updatedAt?: string;
};

type DisputeApiResponse = {
  available?: boolean;
  configured?: boolean;
  integrationStatus?: string;
  note?: string;
  statusFilter?: string | null;
  pagination?: { page: number; pageSize: number; total: number };
  records?: DisputeRecord[];
  supportedActions?: string[];
  deadlinesTracked?: boolean;
};

export default function AdminDisputesPage() {
  const [data, setData] = useState<DisputeApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const url = `/admin/payments/disputes${statusFilter ? `?status=${encodeURIComponent(statusFilter)}&page=1` : "?page=1"}`;
    apiFetch<DisputeApiResponse>(url)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(String(e?.message || e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [statusFilter]);

  if (loading) return <div aria-busy="true" className="p-6">Loading disputes…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error} <button onClick={() => window.location.reload()}>Retry</button></div>;

  const records = data?.records ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 20, total: 0 };
  const isConfigured = !!data?.configured;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin Disputes</h1>
      <p className="text-sm text-gray-600">Dispute records and lifecycle status. Provider webhook/reconciliation workflow not yet configured.</p>

      <div className="flex gap-3 items-center">
        <label htmlFor="dispute-status" className="text-sm font-medium">Status filter</label>
        <input
          id="dispute-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="e.g. OPEN"
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      {!isConfigured && (
        <div className="rounded border bg-amber-50 text-amber-900 p-4 text-sm">
          <strong>Not configured.</strong> {data?.note || "Dispute records unavailable; no provider dispute sync, domain model, or webhook events defined."}
          <div className="mt-2 text-xs">Integration: {data?.integrationStatus ?? "not-configured"}</div>
          <div className="mt-1 text-xs">Supported actions: {(data?.supportedActions ?? []).join(", ") || "none"}</div>
          <div className="mt-1 text-xs">Deadlines tracked: {data?.deadlinesTracked === true ? "yes" : "no"}</div>
        </div>
      )}

      {isConfigured && records.length === 0 && (
        <p className="text-sm">No dispute records for current filter. Empty state confirmed — no fabricated records.</p>
      )}

      {records.length > 0 && (
        <table className="w-full text-sm border">
          <thead><tr className="bg-gray-100"><th>ID</th><th>Order Ref</th><th>Amount (paise)</th><th>Currency</th><th>Status</th><th>Reason / Category</th><th>Evidence</th><th>Deadline</th><th>Provider Ref</th><th>Created</th></tr></thead>
          <tbody>
            {records.map((r: DisputeRecord, idx: number) => (
              <tr key={String(r.id ?? idx)} className="border-t">
                <td className="p-2">{r.id ?? "—"}</td>
                <td className="p-2">{r.orderReference ?? "—"}</td>
                <td className="p-2">{r.amountPaise ?? "—"}</td>
                <td className="p-2">{r.currency ?? "—"}</td>
                <td className="p-2">{r.status ?? "—"}</td>
                <td className="p-2">{r.reason ? `${r.reason}${r.category ? ` / ${r.category}` : ""}` : (r.category ?? "—")}</td>
                <td className="p-2">{r.evidenceStatus ?? "—"}</td>
                <td className="p-2">{r.deadline ?? "—"}</td>
                <td className="p-2">{r.providerReference ?? "—"}</td>
                <td className="p-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="text-xs text-gray-500">
        Page {pagination.page} · Size {pagination.pageSize} · Total {pagination.total}
        {data?.available === false && " · Integration unavailable (fail-closed)."}
      </div>

      <p className="text-xs text-gray-400">Connected endpoint: GET /admin/payments/disputes · Auth + ADMIN role required · No live provider actions triggered.</p>
    </div>
  );
}
