/**
 * ErrorBoundary — React class-based error boundary for operational portals (§4.3).
 *
 * Catches render-time errors in children and shows a graceful fallback
 * that uses EmptyState for visual consistency. Supports an optional reset
 * action (button click retries the subtree).
 *
 * Per Next.js App Router conventions, route segment error.tsx files
 * already cover unhandled exceptions; this component handles errors
 * raised *inside* dashboard subtrees (charts, tables, etc.) so the
 * whole page doesn't blank.
 */

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional label for the failure region (e.g. "Fulfillment chart"). */
  label?: string;
  /** Custom fallback render; if omitted, uses the default EmptyState. */
  fallback?: (err: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In a real app, ship to Sentry/Datadog here.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", this.props.label ?? "unknown", error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <EmptyState
        icon={
          <div
            className={cn(
              "rounded-full p-3",
              "bg-[var(--color-destructive)]/10"
            )}
          >
            <AlertTriangle
              className="h-8 w-8 text-[var(--color-destructive)]"
              aria-hidden
            />
          </div>
        }
        title={`${this.props.label ?? "Section"} failed to render`}
        description={error.message}
        action={
          <button
            type="button"
            onClick={this.reset}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
              "hover:opacity-90",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ring)]"
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </button>
        }
      />
    );
  }
}
