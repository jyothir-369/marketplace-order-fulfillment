/**
 * TelemetryCard — compact metric card for the admin dashboard (§4.2).
 *
 * Displays:
 *   - label  : short uppercase metric name
 *   - value  : tabular (monospace-aligned) primary value
 *   - trend  : optional percentage delta (+/-) with colour tone
 *   - tone   : default | warning | danger | success — drives accent ring
 *
 * Uses only CSS variables (--color-*) — no raw hex.
 */

"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "@/lib/status-tokens";

type Tone = "default" | "warning" | "danger" | "success";

interface TelemetryCardProps {
  label: string;
  value: string | number;
  /** Optional % change or subtitle string */
  trend?: string;
  /** Positive = up, negative = down */
  trendDirection?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}

const toneClasses: Record<Tone, { ring: string; icon: string; trend: string }> = {
  default: {
    ring: "ring-[var(--color-border)]",
    icon: "text-[var(--color-muted-foreground)]",
    trend: "text-[var(--color-muted-foreground)]",
  },
  success: {
    ring: "ring-[var(--color-success)]/30",
    icon: "text-[var(--color-success)]",
    trend: "text-[var(--color-success)]",
  },
  warning: {
    ring: "ring-[var(--color-warning)]/30",
    icon: "text-[var(--color-warning)]",
    trend: "text-[var(--color-warning)]",
  },
  danger: {
    ring: "ring-[var(--color-destructive)]/30",
    icon: "text-[var(--color-destructive)]",
    trend: "text-[var(--color-destructive)]",
  },
};

export function TelemetryCard({
  label,
  value,
  trend,
  trendDirection = "neutral",
  icon: Icon,
  tone = "default",
  className,
}: TelemetryCardProps) {
  const { ring, icon: iconClass, trend: trendClass } = toneClasses[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4",
        "bg-[var(--color-card)] border-[var(--color-border)]",
        "ring-1",
        ring,
        "shadow-sm",
        className
      )}
    >
      {/* Subtle background accent strip */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5",
          tone === "success" ? "bg-[var(--color-success)]" :
          tone === "warning" ? "bg-[var(--color-warning)]" :
          tone === "danger"  ? "bg-[var(--color-destructive)]" :
          "bg-[var(--color-border)]"
        )}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        {/* Label + value */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-[var(--color-foreground)]">
            {value}
          </p>
          {trend && (
            <p className={cn("mt-1.5 text-xs font-medium", trendClass)}>
              {trendDirection === "up" && trend.startsWith("+") ? "+" : ""}
              {trendDirection === "down" && trend.startsWith("-") ? "" : ""}
              {trend}
            </p>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            className={cn(
              "rounded-lg p-2 shrink-0",
              tone === "success" ? "bg-[var(--color-success)]/10" :
              tone === "warning" ? "bg-[var(--color-warning)]/10" :
              tone === "danger"  ? "bg-[var(--color-destructive)]/10" :
              "bg-[var(--color-muted)]"
            )}
          >
            <Icon
              className={cn("h-5 w-5", iconClass)}
              aria-hidden
            />
          </div>
        )}
      </div>
    </div>
  );
}
