/**
 * FulfillmentMetricsChart — Recharts area chart for fulfillment throughput (§4.4).
 *
 * Renders a stacked area chart of order states over time:
 *   - Placed, Fulfilling, Fulfilled, Dead-Letter
 *
 * Series colors are read from CSS variables (`var(--color-status-*)`)
 * to maintain token compliance and dark-mode awareness.
 *
 * Accepts a series of { date, placed, fulfilling, fulfilled, deadLetter } points.
 */

"use client";

import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FulfillmentDataPoint {
  /** ISO date string or label string for the X axis */
  date: string;
  placed?: number;
  fulfilling?: number;
  fulfilled?: number;
  deadLetter?: number;
}

interface FulfillmentMetricsChartProps {
  data: FulfillmentDataPoint[];
  loading?: boolean;
  height?: number;
  className?: string;
}

const series = [
  { key: "placed", label: "Placed", tokenVar: "--color-status-placed" },
  { key: "fulfilling", label: "Fulfilling", tokenVar: "--color-status-fulfilling" },
  { key: "fulfilled", label: "Fulfilled", tokenVar: "--color-status-fulfilled" },
  { key: "deadLetter", label: "Dead-Letter", tokenVar: "--color-status-dead-letter" },
] as const;

export function FulfillmentMetricsChart({
  data,
  loading = false,
  height = 280,
  className,
}: FulfillmentMetricsChartProps) {
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
        <Activity className="h-5 w-5 text-[var(--color-muted-foreground)]" aria-hidden />
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

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
          <TrendingUp className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Order Throughput
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: `hsl(var(${s.tokenVar}))` }}
                aria-hidden
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div
          className="flex items-center justify-center text-sm text-[var(--color-muted-foreground)]"
          style={{ height }}
        >
          No throughput data yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`grad-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={`hsl(var(${s.tokenVar}))`} stopOpacity={0.45} />
                  <stop offset="95%" stopColor={`hsl(var(${s.tokenVar}))`} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="hsl(var(--color-border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--color-muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--color-muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={36}
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
            />
            <Area
              type="monotone"
              dataKey="placed"
              stroke="hsl(var(--color-status-placed))"
              fill="url(#grad-placed)"
              strokeWidth={2}
              isAnimationActive
            />
            <Area
              type="monotone"
              dataKey="fulfilling"
              stroke="hsl(var(--color-status-fulfilling))"
              fill="url(#grad-fulfilling)"
              strokeWidth={2}
              isAnimationActive
            />
            <Area
              type="monotone"
              dataKey="fulfilled"
              stroke="hsl(var(--color-status-fulfilled))"
              fill="url(#grad-fulfilled)"
              strokeWidth={2}
              isAnimationActive
            />
            <Area
              type="monotone"
              dataKey="deadLetter"
              stroke="hsl(var(--color-status-dead-letter))"
              fill="url(#grad-deadLetter)"
              strokeWidth={2}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
