"use client";

import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import type { AuditLogEntryDto } from "@/lib/types";

interface AuditTimelineProps {
  entries: AuditLogEntryDto[];
}

function diffKeys(prev: Record<string, unknown> | null | undefined, next: Record<string, unknown> | null | undefined): { key: string; from: unknown; to: unknown }[] {
  const out: { key: string; from: unknown; to: unknown }[] = [];
  const a = prev ?? {};
  const b = next ?? {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const from = a[k];
    const to = b[k];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      out.push({ key: k, from, to });
    }
  }
  return out;
}

export function AuditTimeline({ entries }: AuditTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-text-muted">No audit entries found for this order.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-border pl-6">
      {entries.map(entry => {
        const isFailure = /fail|error|cancel/i.test(entry.action);
        const isSuccess = /fulfill|complete|ship/i.test(entry.action) && !isFailure;
        const Icon = isFailure ? XCircle : isSuccess ? CheckCircle : Clock;
        const iconColor = isFailure ? "text-alert-error" : isSuccess ? "text-accent-success" : "text-text-muted";
        const diffs = entry.previousState || entry.newState
          ? diffKeys(entry.previousState, entry.newState)
          : [];

        return (
          <li key={entry.id} className="relative">
            <span className={["absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-surface-elevated", iconColor].join(" ")}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="rounded-md border border-border bg-surface-elevated p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">{entry.action}</p>
                <p className="text-xs text-text-muted">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                <span className="font-mono">{entry.entityType}</span>
                <span className="mx-1">·</span>
                <span className="font-mono">{entry.entityId}</span>
              </p>
              <p className="mt-2 text-sm text-text-primary">{entry.message}</p>
              {diffs.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-accent-primary">
                    Show {diffs.length} field change{diffs.length === 1 ? "" : "s"}
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-surface-base p-2 text-[11px] leading-relaxed text-text-primary">
                    {JSON.stringify(diffs, null, 2)}
                  </pre>
                </details>
              )}
              {entry.correlationId && (
                <p className="mt-2 font-mono text-[10px] text-text-muted">
                  corr: {entry.correlationId}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}