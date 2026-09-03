/**
 * RouteErrorFallback — full-card fallback used by route segment `error.tsx` (§4.4).
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden />
        </div>

        <h2 className="text-lg font-semibold text-red-800 mb-2">{headline}</h2>

        <p className="text-sm text-red-700 mb-4">
          An unexpected error occurred while loading the {label}. This has been
          recorded and you can retry below.
        </p>

        {process.env.NODE_ENV === "development" && error && (
          <details className="text-left mb-4">
            <summary className="text-xs text-red-600 cursor-pointer mb-1">
              Technical details
            </summary>
            <pre className="bg-red-100 border border-red-200 rounded p-2 text-xs overflow-auto text-red-800">
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
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded transition-colors inline-flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
      </div>
    </div>
  );
}
