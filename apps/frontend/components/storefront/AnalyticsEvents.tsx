/**
 * components/storefront/AnalyticsEvents.tsx — Phase 6 event instrumentation.
 * Non-blocking; connects to lib/analytics. Privacy-conscious (no PII).
 */
"use client";

import { useEffect } from "react";
import { track, AnalyticsMetrics } from "@/lib/analytics";

export function AnalyticsPageEvents({
  category,
  label,
  eventName,
}: {
  category?: string;
  label?: string;
  eventName?: string;
}) {
  useEffect(() => {
    track({
      event: eventName ?? "navigation_clicked",
      category: category ?? "navigation",
      label,
    });
  }, [category, label, eventName]);
  return null;
}

export function MetricsPanel() {
  return (
    <aside aria-label="Navigation metrics" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 mb-8">
      <h2 className="font-display text-xl font-bold mb-4">Measurement — Phase 6</h2>
      <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Navigation metrics</h3>
      <ul className="grid sm:grid-cols-2 gap-1 text-sm text-[var(--color-warm-muted)] mb-4" aria-label="Metrics list">
        {AnalyticsMetrics.NAVIGATION_METRICS.map((m) => (
          <li key={m} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)]" aria-hidden />{m}</li>
        ))}
      </ul>
      <h3 className="text-xs font-bold uppercase tracking-wide mb-2">Usability-test journeys</h3>
      <ol className="list-decimal list-inside text-sm text-[var(--color-warm-muted)] space-y-1" aria-label="Test journeys">
        {AnalyticsMetrics.TEST_JOURNEYS.map((j) => (
          <li key={j}><strong>{j}</strong> — verified via navigation flow.</li>
        ))}
      </ol>
      <p className="text-xs text-[var(--color-warm-subtle)] mt-3">Events are non-blocking, privacy-conscious, and stored locally (no PII transmitted).</p>
    </aside>
  );
}
