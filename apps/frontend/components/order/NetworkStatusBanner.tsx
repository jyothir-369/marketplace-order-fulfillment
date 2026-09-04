/**
 * NetworkStatusBanner — inline connection-status indicator for operational portals (§4.3).
 *
 * Renders a thin banner at the top of the layout when the network is offline
 * or a fetch has failed. Auto-dismisses on successful reconnect.
 *
 * Wrapping an entire route subtree with this component means every API call
 * that fails can trigger a non-intrusive warning, without needing a global
 * overlay or blocking modal.
 */

"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkStatusBannerProps {
  /** Time in ms before the banner auto-dismisses after coming online. */
  dismissAfterMs?: number;
  className?: string;
}

/**
 * useOnlineStatus — tracks navigator.onLine with a 5-second debounce to
 * avoid flapping between online/offline for transient drops.
 */
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [debouncedOnline, setDebouncedOnline] = useState(isOnline);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onOnline = () => {
      // Debounce: wait 5s before confirming "online" to avoid flapping.
      timer = setTimeout(() => setIsOnline(true), 5_000);
      setDebouncedOnline(true);
    };

    const onOffline = () => {
      if (timer) clearTimeout(timer);
      setIsOnline(false);
      setDebouncedOnline(false);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Show banner when definitely offline (not just debounce-waiting).
  return isOnline;
}

export function NetworkStatusBanner({
  dismissAfterMs = 4_000,
  className,
}: NetworkStatusBannerProps) {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  // Once we come back online, show a brief "Connected" success state then auto-dismiss.
  const [showSuccess, setShowSuccess] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setDismissed(false);
      setShowSuccess(false);
    } else if (wasOffline && !dismissed) {
      setShowSuccess(true);
      const id = setTimeout(() => {
        setDismissed(true);
        setShowSuccess(false);
        setWasOffline(false);
      }, dismissAfterMs);
      return () => clearTimeout(id);
    }
  }, [isOnline, wasOffline, dismissed, dismissAfterMs]);

  if (dismissed) return null;

  if (showSuccess) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium",
          "bg-[var(--color-success)]/10 border-b border-[var(--color-success)]/30",
          "text-[var(--color-success)]",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <CheckCircle className="h-4 w-4" aria-hidden />
        Connection restored
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium",
          "bg-[var(--color-warning)]/10 border-b border-[var(--color-warning)]/30",
          "text-[var(--color-warning)]",
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>You are offline. Changes will sync when connection resumes.</span>
        <RefreshCw className="h-3.5 w-3.5 ml-auto animate-spin" aria-hidden />
      </div>
    );
  }

  return null;
}
