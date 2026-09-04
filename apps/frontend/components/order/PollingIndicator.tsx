/**
 * PollingIndicator — small live-status pill shown while an order is polling (§2.2).
 *
 * Props:
 *   isPolling  — whether polling is currently active
 *   lastUpdated — ISO timestamp of last successful fetch (shown as relative time)
 */
"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface PollingIndicatorProps {
  isPolling: boolean;
  lastUpdated?: Date | null;
}

export function PollingIndicator({ isPolling, lastUpdated }: PollingIndicatorProps) {
  const [tick, setTick] = useState(0);

  // Re-render every 10s to update the "X seconds ago" label
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  if (!isPolling) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium"
      role="status"
      aria-live="polite"
      aria-label="Order status is being updated"
    >
      <RefreshCw
        className="h-3 w-3 animate-spin"
        aria-hidden
      />
      <span>
        Live
        {lastUpdated && ` \u2022 updated ${relativeSeconds(lastUpdated)}`}
      </span>
    </div>
  );
}

function relativeSeconds(date: Date): string {
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.round(diffSec / 60)}m ago`;
}
