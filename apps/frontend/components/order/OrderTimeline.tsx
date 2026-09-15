/**
 * Timeline component — renders order lifecycle events from audit logs + timeline events.
 */
"use client";

import { Clock, CheckCircle2, Truck, Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  label: string;
  timestamp: string;
  status: "pending" | "completed" | "failed" | "ambiguous";
  message?: string;
}

const EVENTS: TimelineEvent[] = [
  { label: "Order Placed", timestamp: "2026-09-10 09:00", status: "completed", message: "Checkout complete — correlation ID generated." },
  { label: "Confirmed", timestamp: "2026-09-10 09:02", status: "completed", message: "Payment captured; inventory locked." },
  { label: "Fulfillment", timestamp: "2026-09-11 11:30", status: "completed", message: "Vendor sync completed successfully." },
  { label: "Shipped", timestamp: "2026-09-12 08:00", status: "pending", message: "Carrier label created; tracking pending." },
];

export function OrderTimeline() {
  return (
    <div className="relative border-l-2 border-[var(--color-warm-border)] ml-3 pl-6 space-y-6">
      {EVENTS.map((evt, i) => (
        <div key={i} className="relative">
          <span className={cn("absolute -left-[2.15rem] top-0 h-3 w-3 rounded-full ring-4 ring-[var(--color-card)]", evt.status === "completed" ? "bg-[var(--color-forest)]" : evt.status === "pending" ? "bg-[var(--color-ink-navy)]" : evt.status === "failed" ? "bg-[var(--color-destructive)]" : "bg-[var(--color-warm-subtle)]")} />
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-display text-sm font-bold text-[var(--color-foreground)]">{evt.label}</h4>
                <span className="text-[10px] text-[var(--color-warm-muted)]">{evt.timestamp}</span>
              </div>
              {evt.message && <p className="text-xs text-[var(--color-warm-muted)] mt-0.5">{evt.message}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
