/**
 * app/(operational)/admin/dead-letter/page.tsx — Dead Letter Inspector (§4.4).
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getDeadLetterJobs, isAbortError } from "@/lib/api";
import { DeadLetterInspector } from "@/components/operational/DeadLetterInspector";
import type { DeadLetterJobDto } from "@/lib/types";

export default function AdminDeadLetterPage() {
  const [jobs, setJobs] = useState<DeadLetterJobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request-race guards (same pattern as admin/orders).
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const data = await getDeadLetterJobs(ac.signal);
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setJobs(data);
    } catch (err) {
      if (isAbortError(err)) return;
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      const msg = err instanceof Error ? err.message : "Failed to load dead-letter jobs";
      setError(msg);
      // eslint-disable-next-line no-console
      console.warn(msg);
    } finally {
      if (requestId === requestIdRef.current && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Global Dead-Letter Queue
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
          Failed sync jobs from the vendor fulfillment pipeline.
        </p>
      </div>
      <DeadLetterInspector jobs={jobs} loading={loading} onRefresh={load} />
    </div>
  );
}
