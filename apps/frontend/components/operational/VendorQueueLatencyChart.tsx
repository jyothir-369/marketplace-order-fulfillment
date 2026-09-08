/**
 * VendorQueueLatencyChart â€” Recharts bar chart for vendor queue latency (Â§4.4).
 *
 * Visualises per-vendor pipeline latency (in milliseconds) so operators
 * can spot vendors that are causing fulfillment delays.
 *
 * Colors come from CSS variable tokens; chart text inherits theme.
 */

"use client";

import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Gauge, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VendorLatencyPoint {
  /** Vendor identifier (or vendor name for human readability) */
  vendorId: string;
  vendorName?: string;
  /** Latency in milliseconds */
  latencyMs: number;
  /** Optional backlog (number of jobs queued) for stacked variants */
  backlog?: number;
}

interface VendorQueueLatencyChartProps {
  data: VendorLatencyPoint[];
  loading?: boolean;
  height?: number;
  /** Above this ms threshold, the bar renders in the danger tone. */
  dangerThresholdMs?: number;
  /** Above this ms threshold, the bar renders in the warning tone. */
  warningThresholdMs?: number;
  className?: string;
}

/**
 * Pick the status tone for a single bar based on its latency vs. thresholds.
 * Recharts requires per-cell stroke/fill, so we render <Cell>s.
 */
function toneForLatency(
  latencyMs: number,
  dangerAt: number,
  warningAt: number
): string {
  if (latencyMs >= dangerAt) return "hsl(var(--color-destructive))";
  if (latencyMs >= warningAt) return "hsl(var(--color-warning))";
  return "hsl(var(--color-status-fulfilled))";
}

export function VendorQueueLatencyChart({
  data,
  loading = false,
  height = 280,
  dangerThresholdMs = 5_000,
  warningThresholdMs = 1_500,
  className,
}: VendorQueueLatencyChartProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border bg-[var(--color-card)]",
          "border-[var(--color-border)] animate-pulse",
          className
        )}
        style={{ height }}
      >
        <Gauge className="h-5 w-5 text-[var(--color-muted-foreground)]" aria-hidden />
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  // Sort so slowest vendor surfaces at the top of the list visually.
  const sorted = [...(data ?? [])].sort((a, b) => b.latencyMs - a.latencyMs);

  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--color-card)] shadow-sm",
        "border-[var(--color-border)] p-4",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Vendor Queue Latency
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "hsl(var(--color-status-fulfilled))" }}
              aria-hidden
            />
            Healthy
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "hsl(var(--color-warning))" }}
              aria-hidden
            />
            Warn (&ge;{Math.round(warningThresholdMs / 1000)}s)
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "hsl(var(--color-destructive))" }}
              aria-hidden
            />
            Danger (&ge;{Math.round(dangerThresholdMs / 1000)}s)
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div
          className="flex items-center justify-center text-sm text-[var(--color-muted-foreground)]"
          style={{ height }}
        >
          No latency samples yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={sorted}
            margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
            layout="vertical"
          >
            <CartesianGrid stroke="hsl(var(--color-border))" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              stroke="hsl(var(--color-muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(Number(v) / 100) / 10}s`}
            />
            <YAxis
              type="category"
              dataKey="vendorName"
              stroke="hsl(var(--color-muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--color-card))",
                border: "1px solid hsl(var(--color-border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--color-foreground))",
              }}
              labelStyle={{ color: "hsl(var(--color-muted-foreground))" }}
              formatter={(value: unknown) => {
                const n = typeof value === "number" ? value : Number(String(value ?? "0"));
                if (!Number.isFinite(n)) return [String(value), "Latency"];
                return [`${(n / 1000).toFixed(2)}s`, "Latency"];
              }}
            />
            <Bar dataKey="latencyMs" radius={[0, 4, 4, 0]}>
              {sorted.map((p) => (
                <Cell
                  key={p.vendorId}
                  fill={toneForLatency(p.latencyMs, dangerThresholdMs, warningThresholdMs)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
