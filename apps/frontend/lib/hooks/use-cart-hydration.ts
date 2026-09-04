/**
 * use-cart-hydration — prevents SSR hydration mismatch on Zustand-persisted cart (§3.1).
 *
 * During SSR and the first client render, localStorage is not available, so
 * Zustand''s `persist` middleware cannot hydrate the store yet. This hook
 * blocks rendering of cart-dependent UI (e.g. cart counter badge, checkout
 * button) until the store has rehydrated from localStorage.
 *
 * Usage:
 *   const hydrated = useCartHydration();
 *   if (!hydrated) return <Skeleton />;
 *   return <CartCounter />;
 *
 * Alternatively use `useCartStore(selectHydrated)` directly.
 */

"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/context/CartStore";

/** Returns `true` once the cart store has rehydrated from localStorage. */
export function useCartHydration(): boolean {
  const hydrated = useCartStore((s) => s.hydrated);

  // On the server and very first render, `hydrated` is always false.
  // We use a local state to also guard against the flash of unstyled content
  // that can happen if React hydrates before Zustand calls `onRehydrateStorage`.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return hydrated && mounted;
}
