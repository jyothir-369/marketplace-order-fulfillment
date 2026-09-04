"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { DeadLetterJob, getVendorDeadLetterJobs } from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

function VendorDLQInner() {
  const { push: toast } = useToast();
  const [jobs, setJobs] = useState<DeadLetterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVendorDeadLetterJobs();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dead-Letter Queue</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Vendor sync jobs that exhausted all retry attempts.</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-50">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}

      {loading && Array.from({ length: 3 }).map((_, i) => <div key={"sk-" + i} className="h-16 bg-white border border-zinc-200 rounded animate-pulse" />)}

      {!loading && jobs.length === 0 && <EmptyState icon={<AlertTriangle size={40} />} title="No dead-letter jobs" description="All vendor sync jobs are healthy." />}

      {!loading && jobs.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="p-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wide w-32">Job ID</th>
                <th className="p-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wide">Line Item</th>
                <th className="p-3 text-center text-xs font-semibold text-zinc-700 uppercase tracking-wide w-24">Attempts</th>
                <th className="p-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wide w-36">Last Attempt</th>
                <th className="p-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wide">Error</th>
                <th className="p-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wide w-32">Correlation</th>
                <th className="p-3 text-center text-xs font-semibold text-zinc-700 uppercase tracking-wide w-16">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map(job => {
                const errMsg = job.errorMessage ?? job.vendorResponse ?? null;
                const pct = Math.round((job.attempts / job.maxAttempts) * 100);
                return (
                  <tr key={job.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono text-xs text-zinc-500">{job.id.slice(0, 8)}</td>
                    <td className="p-3 font-mono text-xs text-zinc-500">{job.orderLineItemId.slice(0, 8)}</td>
                    <td className="p-3 text-center">
                      <span className="font-mono text-xs font-semibold">{job.attempts}</span>
                      <span className="text-zinc-400"> / {job.maxAttempts}</span>
                      <div className="mt-1 h-1 bg-zinc-200 rounded overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: pct + "%" }} />
                      </div>
                    </td>
                    <td className="p-3 text-xs text-zinc-600">{job.lastAttemptedAt ? new Date(job.lastAttemptedAt).toLocaleString() : "—"}</td>
                    <td className="p-3 text-xs text-red-600 max-w-xs">
                      {errMsg ? <span>{errMsg.length > 80 ? errMsg.slice(0, 80) + "…" : errMsg}</span> : <span className="text-zinc-400 italic">No error</span>}
                    </td>
                    <td className="p-3 font-mono text-xs text-indigo-600">{job.correlationId ? job.correlationId.slice(0, 8) : "—"}</td>
                    <td className="p-3 text-center"><StatusBadge status={job.status} size="sm" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Need help?</p>
            <p className="mt-1 text-amber-800">Contact support with the correlation ID. Do not retry a job without understanding why it failed.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VendorDeadLetterPage() {
  return <ToastProvider><VendorDLQInner /></ToastProvider>;
}