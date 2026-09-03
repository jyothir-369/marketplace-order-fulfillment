/**
 * AuditLogTimeline — vertical correlation timeline for audit logs (§4.5).
 *
 * Renders audit log entries in a timeline layout:
 *   - Left: status dot + connector line
 *   - Centre: relative timestamp
 *   - Right: entity details + collapsible JSON metadata inspector
 *
 * Generic over the entry type so it works with both AuditLogEntryDto
 * (rich, with previousState/newState) and AdminAuditLogDto (simpler).
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimelineEntryProps<T> {
  entry: T;
  isLast: boolean;
  /** Returns the action string for tone coloring. */
  getAction: (entry: T) => string;
  /** Returns the entity type string. */
  getEntityType: (entry: T) => string;
  /** Returns the entity ID string. */
  getEntityId: (entry: T) => string;
  /** Returns the message string. */
  getMessage: (entry: T) => string;
  /** Returns the correlation ID string | undefined. */
  getCorrelationId: (entry: T) => string | undefined;
  /** Returns the createdAt ISO string. */
  getCreatedAt: (entry: T) => string;
  /** Returns metadata Record | undefined. */
  getMetadata: (entry: T) => Record<string, unknown> | undefined;
  /** Returns previousState Record | null | undefined. */
  getPreviousState: (entry: T) => Record<string, unknown> | null | undefined;
  /** Returns newState Record | null | undefined. */
  getNewState: (entry: T) => Record<string, unknown> | null | undefined;
}

function TimelineEntry<T>({
  entry,
  isLast,
  getAction,
  getEntityType,
  getEntityId,
  getMessage,
  getCorrelationId,
  getCreatedAt,
  getMetadata,
  getPreviousState,
  getNewState,
}: TimelineEntryProps<T>) {
  const [expanded, setExpanded] = useState(false);

  const action = getAction(entry);
  const entityType = getEntityType(entry);
  const entityId = getEntityId(entry);
  const message = getMessage(entry);
  const correlationId = getCorrelationId(entry);
  const createdAt = getCreatedAt(entry);
  const metadata = getMetadata(entry);
  const prevState = getPreviousState(entry);
  const nextState = getNewState(entry);

  const isError =
    action.toUpperCase().includes("FAIL") ||
    action.toUpperCase().includes("ERROR");
  const isSuccess =
    action.toUpperCase().includes("CONFIRM") ||
    action.toUpperCase().includes("FULFILL") ||
    action.toUpperCase().includes("CREATE");

  const lineColor = isError
    ? "bg-[var(--color-destructive)]"
    : isSuccess
      ? "bg-[var(--color-success)]"
      : "bg-[var(--color-muted-foreground)]";

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      {!isLast && (
        <div
          className={cn("absolute left-4 top-8 w-0.5 -bottom-2", lineColor, "opacity-40")}
          aria-hidden
        />
      )}

      {/* Dot */}
      <div
        className={cn(
          "relative z-10 mt-1 h-8 w-8 shrink-0 rounded-full border-2 flex items-center justify-center",
          isError
            ? "border-[var(--color-destructive)] bg-[var(--color-destructive)]/10"
            : isSuccess
              ? "border-[var(--color-success)] bg-[var(--color-success)]/10"
              : "border-[var(--color-border)] bg-[var(--color-card)]"
        )}
        aria-hidden
      >
        <StatusBadge status={action} size="sm" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Action badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground)]">
                {action}
              </span>
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {entityType} &middot;{" "}
                <code className="font-mono">{entityId.slice(0, 8)}…</code>
              </span>
            </div>

            <p className="mt-1 text-sm text-[var(--color-foreground)]">{message}</p>

            {correlationId && (
              <p className="mt-0.5 text-[10px] font-mono text-[var(--color-muted-foreground)]">
                corr: {correlationId}
              </p>
            )}

            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {formatRelativeTime(createdAt)}
            </p>
          </div>

          {(metadata || prevState || nextState) && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className={cn(
                "shrink-0 rounded-md p-1 text-xs",
                "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                "hover:bg-[var(--color-accent)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              )}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse details" : "Expand details"}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          )}
        </div>

        {/* Collapsible JSON */}
        {expanded && (
          <div className="mt-2 space-y-2">
            {metadata && <MetadataBlock label="Metadata" data={metadata} />}
            {prevState && <MetadataBlock label="Previous state" data={prevState} />}
            {nextState && <MetadataBlock label="New state" data={nextState} />}
          </div>
        )}
      </div>
    </div>
  );
}

function MetadataBlock({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown> | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div className="rounded-md border border-[var(--color-border)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between px-3 py-1.5",
          "bg-[var(--color-muted)]/40 text-xs font-semibold",
          "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
        )}
        aria-expanded={open}
      >
        <span>{label}</span>
        {open ? (
          <ChevronUp className="h-3 w-3" aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden />
        )}
      </button>
      {open && (
        <pre className="overflow-x-auto bg-[var(--color-muted)]/20 px-3 py-2 text-xs font-mono text-[var(--color-foreground)]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export interface AuditLogTimelineProps<T> {
  /** Array of audit log entries */
  logs: T[];
  loading?: boolean;
  visibleCount?: number;
  getAction: (entry: T) => string;
  getEntityType: (entry: T) => string;
  getEntityId: (entry: T) => string;
  getMessage: (entry: T) => string;
  getCorrelationId: (entry: T) => string | undefined;
  getCreatedAt: (entry: T) => string;
  getMetadata?: (entry: T) => Record<string, unknown> | undefined;
  getPreviousState?: (entry: T) => Record<string, unknown> | null | undefined;
  getNewState?: (entry: T) => Record<string, unknown> | null | undefined;
}

export function AuditLogTimeline<T>({
  logs,
  loading = false,
  visibleCount = 50,
  getAction,
  getEntityType,
  getEntityId,
  getMessage,
  getCorrelationId,
  getCreatedAt,
  getMetadata = () => undefined,
  getPreviousState = () => undefined,
  getNewState = () => undefined,
}: AuditLogTimelineProps<T>) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton width="2rem" height="2rem" className="rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton height="0.75rem" width="60%" />
              <Skeleton height="0.75rem" width="40%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div
        className="flex h-32 items-center justify-center text-sm text-[var(--color-muted-foreground)]"
        role="status"
      >
        No audit log entries found.
      </div>
    );
  }

  const visible = showAll ? logs : logs.slice(0, visibleCount);

  return (
    <div className="space-y-0">
      {visible.map((entry, i) => (
        <TimelineEntry<T>
          key={String(getEntityId(entry)) + String(getCreatedAt(entry))}
          entry={entry}
          isLast={i === visible.length - 1}
          getAction={getAction}
          getEntityType={getEntityType}
          getEntityId={getEntityId}
          getMessage={getMessage}
          getCorrelationId={getCorrelationId}
          getCreatedAt={getCreatedAt}
          getMetadata={getMetadata}
          getPreviousState={getPreviousState}
          getNewState={getNewState}
        />
      ))}
      {!showAll && logs.length > visibleCount && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={cn(
            "ml-12 mt-1 text-xs underline underline-offset-2",
            "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          )}
        >
          Show {logs.length - visibleCount} more entries
        </button>
      )}
    </div>
  );
}
