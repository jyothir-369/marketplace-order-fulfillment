"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle, Clock, RefreshCw, Search, XCircle } from "lucide-react";
import { getAuditLogs, getCorrelationTrace } from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminAuditLogDto, AuditLogEntryDto } from "@/lib/types";

const TRACE_ICON_MAP: Record<string, React.ComponentType<Record<string, unknown>>> = {
  FULFILL: CheckCircle,
  CONFIRM: CheckCircle,
  CANCEL: XCircle,
  SHIP: CheckCircle,
};

function AuditLogsInner() {
  const { push: toast } = useToast();
  const [searchId, setSearchId] = useState("");
  const [logs, setLogs] = useState<AdminAuditLogDto[]>([]);
  const [trace, setTrace] = useState<AuditLogEntryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [traceLoading, setTraceLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try { const data = await getAuditLogs({ limit: 100 }); setLogs(data.logs ?? []); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed to load audit logs", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadLogs(); }, []);

  const handleTrace = async (correlationId: string) => {
    setTraceLoading(true); setTrace([]);
    try { const data = await getCorrelationTrace(correlationId); setTrace(data.logs ?? []); }
    catch (err) { toast(err instanceof Error ? err.message : "Failed to load trace", "error"); }
    finally { setTraceLoading(false); }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    await handleTrace(searchId.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Audit Logs</h1>
        <button onClick={() => void loadLogs()} className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-base">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <input
            type="text"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="Search by Correlation ID..."
            className="w-full rounded-lg border border-border bg-surface-elevated py-2 pl-10 pr-4 text-sm placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
        <button type="submit" className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Trace
        </button>
      </form>

      {traceLoading && <Skeleton className="h-24 rounded-lg" />}
      {trace.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Full Lifecycle Trace
            <span className="ml-2 font-mono text-xs text-accent-primary">
              {trace[0]?.correlationId}
            </span>
          </h2>
          <div className="overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max">
              {trace.map((entry, i) => {
                const Icon = TRACE_ICON_MAP[entry.action] ?? Clock;
                const isLast = i === trace.length - 1;
                return (
                  <div key={entry.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent-primary bg-surface-elevated">
                        <Icon className="h-4 w-4 text-accent-primary" aria-hidden />
                      </div>
                      <div className="mt-2 max-w-[120px] text-center">
                        <p className="text-xs font-semibold text-text-primary">{entry.action}</p>
                        <p className="mt-0.5 text-[10px] text-text-muted">{entry.entityType}</p>
                        <p className="text-[10px] text-text-muted">{new Date(entry.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    {!isLast && <ArrowRight className="mx-2 h-4 w-4 shrink-0 text-border" aria-hidden /> }
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface-elevated shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Recent Events</h2>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center">
            <p className="text-sm text-text-muted">No audit logs found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-base text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Time</th>
                <th className="px-4 py-2 text-left font-medium">Action</th>
                <th className="px-4 py-2 text-left font-medium">Entity</th>
                <th className="px-4 py-2 text-left font-medium">Correlation ID</th>
                <th className="px-4 py-2 text-left font-medium">Message</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-surface-base">
                  <td className="px-4 py-2 text-xs text-text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className="rounded border border-accent-primary/30 bg-accent-primary/5 px-1.5 py-0.5 text-xs font-medium text-accent-primary">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <span className="text-text-muted">{log.entityType}</span>
                    <span className="mx-1 font-mono text-[10px]">{log.entityId.slice(0, 8)}...</span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-text-muted">{log.correlationId?.slice(0, 8) ?? "—"}...</td>
                  <td className="px-4 py-2 text-xs text-text-primary">{log.message}</td>
                  <td className="px-4 py-2 text-right">
                    {log.correlationId && (
                      <button
                        onClick={() => void handleTrace(log.correlationId!)}
                        className="rounded px-2 py-0.5 text-xs text-accent-primary hover:bg-accent-primary/10"
                      >
                        Trace
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function AdminAuditLogsPage() {
  return (<ToastProvider><AuditLogsInner /></ToastProvider>);
}