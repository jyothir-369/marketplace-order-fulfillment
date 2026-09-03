/**
 * app/(operational)/admin/dead-letter/page.tsx — Dead Letter Inspector (§4.4).
 */

"use client";

import { useEffect, useState } from "react";
import { getDeadLetterJobs } from "@/lib/api";
import { DeadLetterInspector } from "@/components/operational/DeadLetterInspector";
import type { DeadLetterJobDto } from "@/lib/types";

export default function AdminDeadLetterPage() {
  const [jobs, setJobs] = useState<DeadLetterJobDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setJobs(await getDeadLetterJobs());
    } catch {
      // error handled inside DeadLetterInspector via toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

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
