"use client";
import { useEffect, useState } from "react";

type AllocationRow = {
  id: string | number;
  vendorId: string | number;
  orderRef: string;
  amount: number;
  commission: number;
  rules: string;
  created: string;
};

type TransferRow = {
  id: string | number;
  vendorId: string | number;
  orderRef: string;
  amount: number;
  state: string;
  providerRef?: string | null;
  attempts: number;
  created: string;
  updated: string;
};
import { apiFetch } from "@/lib/api";



export default function AdminPaymentsPage() {
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ allocations: any[]; transfers: any[] }>("/admin/payments/ledger")
      .then((d) => { if (!cancelled) { setLedger(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(String(e?.message || e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div aria-busy="true" className="p-6">Loading ledger…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error} <button onClick={() => window.location.reload()}>Retry</button></div>;

  const allocRows: AllocationRow[] = ledger?.allocations?.map((a: any) => ({
    id: a.id, vendorId: a.vendorId, orderRef: a.orderReference, amount: a.amountPaise, commission: a.commissionPaise, currency: a.currency, rules: a.rulesVersion, created: a.createdAt ? new Date(a.createdAt).toLocaleString() : "",
  })) ?? [];
  const transRows: TransferRow[] = ledger?.transfers?.map((t: any) => ({
    id: t.id, vendorId: t.vendorId, orderRef: t.orderReference, amount: t.amountPaise, state: t.state, providerRef: t.providerTransferId, attempts: t.attempts, created: t.createdAt ? new Date(t.createdAt).toLocaleString() : "", updated: t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "",
  })) ?? [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin Payments Ledger</h1>
      <p className="text-sm text-gray-600">Payment / allocation / transfer states shown separately; refunds and reconciliation gaps documented.</p>
      {allocRows.length === 0 && (transRows.length === 0) && (
        <p className="text-sm">No financial records yet. §9 business rules remain undecided; no invented percentages are applied.</p>
      )}
      {allocRows.length > 0 && (
        <table className="w-full text-sm border" style={{ marginBottom: "1rem" }}>
          <thead><tr className="bg-gray-100"><th>Order Ref</th><th>Vendor</th><th>Amount (paise)</th><th>Commission</th><th>Rules Version</th><th>Created</th></tr></thead>
          <tbody>{allocRows.map((r) => <tr key={r.id} className="border-t"><td className="p-2">{r.orderRef}</td><td className="p-2">{r.vendorId}</td><td className="p-2">{r.amount}</td><td className="p-2">{r.commission}</td><td className="p-2">{r.rules}</td><td className="p-2">{r.created}</td></tr>)}</tbody>
        </table>
      )}
      {transRows.length > 0 && (
        <table className="w-full text-sm border">
          <thead><tr className="bg-gray-100"><th>Order Ref</th><th>Vendor</th><th>Amount (paise)</th><th>State</th><th>Provider Transfer ID</th><th>Attempts</th><th>Created</th><th>Updated</th></tr></thead>
          <tbody>{transRows.map((r) => <tr key={r.id} className="border-t"><td className="p-2">{r.orderRef}</td><td className="p-2">{r.vendorId}</td><td className="p-2">{r.amount}</td><td className="p-2">{r.state}</td><td className="p-2">{r.providerRef ?? "—"}</td><td className="p-2">{r.attempts}</td><td className="p-2">{r.created}</td><td className="p-2">{r.updated}</td></tr>)}</tbody>
        </table>
      )}
      <p className="text-xs text-gray-500">Partial state — full ledger with approvals requires §9 rules + DB verification + provider confirmation.</p>
    </div>
  );
}


