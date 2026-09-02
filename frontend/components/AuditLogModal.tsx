'use client';

import { useEffect, useState } from 'react';
import { AuditLogEntry, getOrderAuditLogs } from '@/lib/api';

interface Props {
  orderId: string | null;
  onClose: () => void;
}

export default function AuditLogModal({ orderId, onClose }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrderAuditLogs(orderId)
      .then((res) => {
        if (!cancelled) setLogs(res.logs);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load audit logs');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Audit log &mdash; order {orderId.slice(0, 8)}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
            aria-label="Close"
          >
            ?
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
              ))}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">
              {error}
            </div>
          )}
          {!loading && !error && logs.length === 0 && (
            <p className="text-sm text-gray-500">No audit entries yet.</p>
          )}
          {!loading && !error && logs.length > 0 && (
            <ol className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="border-l-4 border-gray-300 pl-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                    <span className="font-mono">{log.action}</span>
                  </div>
                  {log.previousState || log.newState ? (
                    <div className="text-sm font-mono text-gray-800 mt-1">
                      {log.previousState?.status ? (
                        <span>
                          {String(log.previousState.status)} &rarr;{' '}
                          {String(log.newState?.status ?? '?')}
                        </span>
                      ) : (
                        <span className="text-gray-400">[no state change]</span>
                      )}
                    </div>
                  ) : null}
                  {log.message && (
                    <p className="text-sm text-gray-700 mt-1">{log.message}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    actor: {log.userId ?? 'system'} &middot; corr:{' '}
                    <span className="font-mono">{log.correlationId.slice(0, 8)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
