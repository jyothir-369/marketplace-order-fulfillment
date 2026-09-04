"use client";

import { RouteErrorFallback } from "@/components/ui/route-error-fallback";

export default function checkoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      label="checkout"
    />
  );
}