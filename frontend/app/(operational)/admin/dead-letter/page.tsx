"use client";

import { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { getDeadLetterJobs, retryDeadLetterJob } from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { DeadLetterJobDto } from "@/lib/types";

function AdminDLQInner() {
  const { push: toast } = useToast();
  const [jobs, setJobs] = useState<DeadLetterJobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setJobs(await getDeadLetterJobs()); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed to load dead-letter queue", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const handleRetry = async (jobId: string) => {
    if (retrying) return;
    setRetrying(jobId);
    try {
      const res = await retryDeadLetterJob(jobId);
      toast(res.message, "success");
      await load();
    } catch (err) { toast(err instanceof Error ? err.message : "Retry failed", "error"); }
    finally { setRetrying(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Global Dead-Letter Queue</h1>
        <button onClick={() => void load()} className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-base">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-elevated">
          <XCircle className="h-8 w-8 text-accent-success" aria-hidden />
          <p className="text-sm text-text-muted">No dead-letter jobs. All clear.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => (
            <div key={job.id} className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-alert-error/30 bg-alert-error/5 px-1.5 py-0.5 text-xs font-medium text-alert-error">
                      DEAD_LETTER
                    </span>
                    <span className="font-mono text-xs text-text-muted">Job {job.id}</span>
                    {job.correlationId && (
                      <span className="font-mono text-[10px] text-text-muted">corr: {job.correlationId}</span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-text-primary">
                    {job.errorMessage ?? "Unknown error"}
                  </p>
                  {job.vendorResponse && (
                    <p className="mt-1 text-xs text-alert-warning">Vendor response: {job.vendorResponse}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
                    <span>Line item: <code className="font-mono">{job.orderLineItemId}</code></span>
                    <span>Attempts: {job.attempts}/{job.maxAttempts}</span>
                    {job.lastAttemptedAt && (
                      <span>Last: {new Date(job.lastAttemptedAt).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-base">
                    <div className="h-full rounded-full bg-alert-error transition-all"
                      style={{ width: `${Math.min(100, (job.attempts / job.maxAttempts) * 100)}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => void handleRetry(job.id)}
                  disabled={retrying !== null}
                  className="flex shrink-0 items-center gap-1.5 rounded border border-accent-primary px-3 py-1.5 text-xs font-medium text-accent-primary hover:bg-accent-primary/10 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  {retrying === job.id ? "Retrying..." : "Retry"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminDLQPage() {
  return (<ToastProvider><AdminDLQInner /></ToastProvider>);
}