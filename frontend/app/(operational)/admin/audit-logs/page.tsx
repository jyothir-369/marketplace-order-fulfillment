/**
 * app/(operational)/admin/audit-logs/page.tsx — Audit Log Timeline (§4.5).
 *
 * Features:
 *   - Filter by entity type, action, or correlation ID
 *   - Trace by correlation ID to see the full lifecycle
 *   - AuditLogTimeline with collapsible JSON metadata inspectors
 */

"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { getAuditLogs, getCorrelationTrace } from "@/lib/api";
import { AuditLogTimeline } from "@/components/operational/AuditLogTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AuditLogEntryDto } from "@/lib/types";

const ENTITY_TYPES = ["Order", "LineItem", "SyncJob", "Product"];

function AuditLogsInner() {
  const [logs, setLogs] = useState<AuditLogEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [correlationId, setCorrelationId] = useState("");

  // Trace mode
  const [traceCorrId, setTraceCorrId] = useState("");
  const [traceMode, setTraceMode] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (traceMode && traceCorrId) {
        const res = await getCorrelationTrace(traceCorrId);
        // Trace returns AdminAuditLogDto (no previous/new state); normalise
        // to AuditLogEntryDto shape so AuditLogTimeline can render it.
        const traceLogs: AuditLogEntryDto[] = (res.logs ?? []).map((l) => ({
          id: l.id,
          correlationId: l.correlationId,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          message: l.message,
          userId: l.userId,
          metadata: l.metadata,
          previousState: undefined,
          newState: undefined,
          createdAt: l.createdAt,
        }));
        setLogs(traceLogs);
        setTotal(res.total ?? traceLogs.length);
      } else {
        const res = await getAuditLogs({
          entityType: entityType || undefined,
          action: action || undefined,
          correlationId: correlationId || undefined,
          limit: 100,
        });
        setLogs(res.logs ?? []);
        setTotal(res.total ?? 0);
      }
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, action, correlationId, traceMode, traceCorrId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Audit Logs</h1>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
          {total > 0 ? `${total} entries` : "Browse the operational event stream."}
        </p>
      </div>

      {/* Filters */}
      <div
        className={cn(
          "flex flex-wrap items-end gap-3 rounded-xl border px-4 py-3",
          "border-[var(--color-border)] bg-[var(--color-card)]"
        )}
      >
        {/* Trace by correlation ID */}
        <div className="flex items-center gap-2 border-r border-[var(--color-border)] pr-3">
          <label
            htmlFor="traceCorrId"
            className="text-xs font-medium text-[var(--color-muted-foreground)] whitespace-nowrap"
          >
            Trace corr ID
          </label>
          <input
            id="traceCorrId"
            type="text"
            value={traceCorrId}
            onChange={(e) => {
              setTraceCorrId(e.target.value);
              setTraceMode(Boolean(e.target.value));
            }}
            placeholder="e.g. abc-123-def"
            className={cn(
              "h-8 w-48 rounded-md border px-2 text-xs",
              "border-[var(--color-border)] bg-[var(--color-background)]",
              "text-[var(--color-foreground)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            )}
          />
          {traceMode && (
            <button
              type="button"
              onClick={() => { setTraceCorrId(""); setTraceMode(false); }}
              className="text-xs text-[var(--color-destructive)] hover:underline"
            >
              Clear trace
            </button>
          )}
        </div>

        {/* Entity type filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="entityType"
            className="text-xs font-medium text-[var(--color-muted-foreground)] whitespace-nowrap"
          >
            Entity
          </label>
          <select
            id="entityType"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className={cn(
              "h-8 rounded-md border px-2 text-xs",
              "border-[var(--color-border)] bg-[var(--color-background)]",
              "text-[var(--color-foreground)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            )}
          >
            <option value="">All</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="actionFilter"
            className="text-xs font-medium text-[var(--color-muted-foreground)] whitespace-nowrap"
          >
            Action
          </label>
          <input
            id="actionFilter"
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. ORDER_PLACED"
            className={cn(
              "h-8 w-40 rounded-md border px-2 text-xs",
              "border-[var(--color-border)] bg-[var(--color-background)]",
              "text-[var(--color-foreground)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            )}
          />
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs",
            "border-[var(--color-border)] bg-[var(--color-background)]",
            "text-[var(--color-foreground)]",
            "hover:bg-[var(--color-accent)]",
            "disabled:opacity-50",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          )}
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          Search
        </button>
      </div>

      {/* Trace mode banner */}
      {traceMode && traceCorrId && (
        <div
          className={cn(
            "rounded-lg border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-4 py-2",
            "text-xs text-[var(--color-info)]"
          )}
          role="status"
          aria-live="polite"
        >
          Showing lifecycle trace for correlation ID:{" "}
          <strong className="font-mono">{traceCorrId}</strong>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton width="2rem" height="2rem" className="rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton height="0.75rem" width="60%" />
                <Skeleton height="0.75rem" width="40%" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AuditLogTimeline
          logs={logs}
          getAction={(e) => e.action}
          getEntityType={(e) => e.entityType}
          getEntityId={(e) => e.entityId}
          getMessage={(e) => e.message}
          getCorrelationId={(e) => e.correlationId}
          getCreatedAt={(e) => e.createdAt}
          getMetadata={(e) => e.metadata}
          getPreviousState={(e) => e.previousState}
          getNewState={(e) => e.newState}
        />
      )}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  return <AuditLogsInner />;
}
