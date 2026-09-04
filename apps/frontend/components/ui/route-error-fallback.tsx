/**
 * RouteErrorFallback — full-card fallback used by route segment error.tsx (§4.4).
 *
 * Renders the canonical error message and a "Try again" action that
 * resets the error boundary by calling the provided reset() callback.
 *
 * Import from "@/components/ui/route-error-fallback".
 */

"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface RouteErrorFallbackProps {
  /** Optional error object (only shown in development). */
  error?: Error;
  /** Reset handler provided by Next.js route-segment error boundary. */
  reset?: () => void;
  /** Optional label describing what failed (e.g. "catalog", "order"). */
  label?: string;
  /** Override the headline. */
  title?: string;
}

export function RouteErrorFallback({
  error,
  reset,
  label = "page",
  title,
}: RouteErrorFallbackProps) {
  const headline = title ?? "Something went wrong";

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-48 text-center">
      <div className="bg-[hsl(var(--color-destructive)/0.08)] border border-[hsl(var(--color-destructive)/0.25)] rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-center w-12 h-12 bg-[hsl(var(--color-destructive)/0.15)] rounded-full mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6 text-[hsl(var(--color-destructive))]" aria-hidden />
        </div>

        <h2 className="text-lg font-semibold text-[hsl(var(--color-destructive))] mb-2">{headline}</h2>

        <p className="text-sm text-[hsl(var(--color-muted-foreground))] mb-4">
          An unexpected error occurred while loading the {label}. This has been
          recorded and you can retry below.
        </p>

        {process.env.NODE_ENV === "development" && error && (
          <details className="text-left mb-4">
            <summary className="text-xs text-[hsl(var(--color-destructive))] cursor-pointer mb-1">
              Technical details
            </summary>
            <pre className="bg-[hsl(var(--color-muted))] border border-[hsl(var(--color-destructive)/0.25)] rounded p-2 text-xs overflow-auto text-[hsl(var(--color-foreground))]">
              {error.name}: {error.message}
              {error.stack && (
                <>
                  {"\n\n"}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}

        <button
          type="button"
          onClick={() => reset?.()}
          className="w-full bg-[hsl(var(--color-destructive))] hover:opacity-90 text-[hsl(var(--color-destructive-foreground))] font-medium py-2 rounded transition-opacity inline-flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}
