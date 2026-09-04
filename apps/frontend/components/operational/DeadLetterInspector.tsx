/**
 * DeadLetterInspector — list view for dead-letter / failed sync jobs (§4.4).
 *
 * Displays DeadLetterJobDto items with:
 *   - status badge
 *   - error message + vendor response
 *   - attempt progress bar
 *   - inline retry button (calls /api/admin/dead-letter/:jobId/retry)
 *   - expand to view full JSON metadata
 */

"use client";

import { useState } from "react";
import { RotateCcw, ChevronDown, ChevronUp, RefreshCw, XCircle, AlertTriangle } from "lucide-react";
import { retryDeadLetterJob } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DeadLetterJobDto } from "@/lib/types";

interface DeadLetterInspectorProps {
  jobs: DeadLetterJobDto[];
  loading: boolean;
  onRefresh: () => void;
}

interface JobCardProps {
  job: DeadLetterJobDto;
  onRetry: (jobId: string) => void;
  retryingId: string | null;
}

function JobCard({ job, onRetry, retryingId }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isRetrying = retryingId === job.id;
  const attemptPct = Math.min(100, (job.attempts / job.maxAttempts) * 100);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        "border-[var(--color-destructive)]/20 bg-[var(--color-card)]",
        "shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1">
          {/* Status + IDs row */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="dead_letter" size="sm" />
            <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
              Job {job.id}
            </span>
            {job.correlationId && (
              <span className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
                corr: {job.correlationId}
              </span>
            )}
          </div>

          {/* Error message */}
          <p className="mt-2 truncate text-sm font-medium text-[var(--color-foreground)]">
            {job.errorMessage ?? "Unknown error"}
          </p>

          {job.vendorResponse && (
            <p className="mt-1 text-xs text-[var(--color-warning)]">
              Vendor: {job.vendorResponse}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
            <span>
              Line item:{" "}
              <code className="font-mono">{job.orderLineItemId.slice(0, 8)}…</code>
            </span>
            <span>
              Attempts:{" "}
              <strong className="text-[var(--color-foreground)]">
                {job.attempts}/{job.maxAttempts}
              </strong>
            </span>
            {job.lastAttemptedAt && (
              <span>Last: {formatRelativeTime(job.lastAttemptedAt)}</span>
            )}
            {job.completedAt && (
              <span>Completed: {formatRelativeTime(job.completedAt)}</span>
            )}
          </div>

          {/* Attempt progress bar */}
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-muted)]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                attemptPct >= 80
                  ? "bg-[var(--color-destructive)]"
                  : attemptPct >= 50
                    ? "bg-[var(--color-warning)]"
                    : "bg-[var(--color-muted-foreground)]"
              )}
              style={{ width: `${attemptPct}%` }}
              role="progressbar"
              aria-valuenow={job.attempts}
              aria-valuemin={0}
              aria-valuemax={job.maxAttempts}
            />
          </div>

          {/* Expanded JSON metadata */}
          {expanded && (
            <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Metadata
              </p>
              <pre className="overflow-x-auto text-xs font-mono text-[var(--color-foreground)]">
                {JSON.stringify(
                  {
                    id: job.id,
                    orderLineItemId: job.orderLineItemId,
                    status: job.status,
                    attempts: job.attempts,
                    maxAttempts: job.maxAttempts,
                    vendorResponse: job.vendorResponse,
                    errorMessage: job.errorMessage,
                    correlationId: job.correlationId,
                    lastAttemptedAt: job.lastAttemptedAt,
                    completedAt: job.completedAt,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => onRetry(job.id)}
            disabled={isRetrying}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium",
              "border-[var(--color-primary)] text-[var(--color-primary)]",
              "hover:bg-[var(--color-primary)]/10",
              "disabled:opacity-50 disabled:pointer-events-none",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            )}
          >
            <RotateCcw className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} aria-hidden />
            {isRetrying ? "Retrying…" : "Retry"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className={cn(
              "inline-flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]",
              "hover:text-[var(--color-foreground)]"
            )}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse metadata" : "Expand metadata"}
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5" aria-hidden /> Hide</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5" aria-hidden /> Details</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeadLetterInspector({ jobs, loading, onRefresh }: DeadLetterInspectorProps) {
  const { push: toast } = useToast();
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (jobId: string) => {
    if (retrying) return;
    setRetrying(jobId);
    try {
      const res = await retryDeadLetterJob(jobId);
      toast(res.message, "success");
      onRefresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Retry failed", "error");
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="7rem" className="rounded-xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div
          className={cn(
            "flex h-48 flex-col items-center justify-center gap-3 rounded-xl border",
            "border-[var(--color-border)] bg-[var(--color-card)]"
          )}
          role="status"
        >
          <div className="rounded-full bg-[var(--color-success)]/10 p-3">
            <XCircle className="h-8 w-8 text-[var(--color-success)]" aria-hidden />
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No dead-letter jobs. All clear.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} in queue
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)]",
                "px-3 py-1.5 text-xs hover:bg-[var(--color-accent)]",
                "text-[var(--color-foreground)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              )}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh
            </button>
          </div>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onRetry={handleRetry}
              retryingId={retrying}
            />
          ))}
        </>
      )}
    </div>
  );
}
