"use client";

import { RouteErrorFallback } from "@/components/ui/route-error-fallback";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback label="admin section" error={error} reset={reset} />;
}