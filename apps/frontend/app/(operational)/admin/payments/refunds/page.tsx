"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type RefundRecord = {
  id?: string | number;
  orderReference?: string;
  amountPaise?: number;
  currency?: string;
  status?: string;
  reason?: string;
  providerReference?: string;
  createdAt?: string;
  updatedAt?: string;
};

type RefundApiResponse = {
  available?: boolean;
  configured?: boolean;
  note?: string;
  statusFilter?: string | null;
  pagination?: { page: number; pageSize: number; total: number };
  records?: RefundRecord[];
  rulesStatus?: any;
  safeOperations?: string[];
  blockedOperations?: string[];
};

export default function AdminRefundsPage() {
  const [data, setData] = useState<RefundApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const url = `/admin/payments/refunds${statusFilter ? `?status=${encodeURIComponent(statusFilter)}&page=1` : "?page=1"}`;
    apiFetch<RefundApiResponse>(url)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(String(e?.message || e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [statusFilter]);

  if (loading) return <div aria-busy="true" className="p-6">Loading refunds…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error} <button onClick={() => window.location.reload()}>Retry</button></div>;

  const records = data?.records ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: 20, total: 0 };
  const note = data?.note ?? "";

  const isConfigured = !!data?.configured;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin Refunds</h1>
      <p className="text-sm text-gray-600">Refund integration status and records. Provider/business rules (§9) determine available operations.</p>

      <div className="flex gap-3 items-center">
        <label htmlFor="refund-status" className="text-sm font-medium">Status filter</label>
        <input
          id="refund-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="e.g. SUBMITTED"
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      {!isConfigured && (
        <div className="rounded border bg-amber-50 text-amber-900 p-4 text-sm">
          <strong>Not configured.</strong> {note || "Refund integration not configured. Provider rules, policy version (§9), and entity persistence required before live refunds."}
          <div className="mt-2 text-xs">Rules status: {JSON.stringify(data?.rulesStatus ?? {})}</div>
          <div className="mt-1 text-xs">Safe operations: {(data?.safeOperations ?? []).join(", ") || "none"}</div>
          <div className="mt-1 text-xs">Blocked: {(data?.blockedOperations ?? []).join(", ") || "none"}</div>
        </div>
      )}

      {isConfigured && records.length === 0 && (
        <p className="text-sm">No refund records for current filter. Empty state confirmed — no fabricated records.</p>
      )}

      {records.length > 0 && (
        <table className="w-full text-sm border">
          <thead><tr className="bg-gray-100"><th>ID</th><th>Order Ref</th><th>Amount (paise)</th><th>Currency</th><th>Status</th><th>Reason</th><th>Provider Ref</th><th>Created</th></tr></thead>
          <tbody>
            {records.map((r: RefundRecord, idx: number) => (
              <tr key={String(r.id ?? idx)} className="border-t">
                <td className="p-2">{r.id ?? "—"}</td>
                <td className="p-2">{r.orderReference ?? "—"}</td>
                <td className="p-2">{r.amountPaise ?? "—"}</td>
                <td className="p-2">{r.currency ?? "—"}</td>
                <td className="p-2">{r.status ?? "—"}</td>
                <td className="p-2">{r.reason ?? "—"}</td>
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

      <p className="text-xs text-gray-400">Connected endpoint: GET /admin/payments/refunds · Auth + ADMIN role required · No live provider actions triggered.</p>
    </div>
  );
}
