/**
 * CartSyncProvider
 *
 * Synchronizes the Zustand cart with the NestJS cart endpoints:
 *   - Optimistic local mutations (the store is updated before the network).
 *   - Debounced, one-flight `PUT /api/cart/:buyerId` sync that always sends
 *     the latest snapshot; interleaved updates coalesce into one request.
 *   - On 409 (inventory conflict) the local cart rolls back to the last
 *     server-confirmed snapshot and the conflicting ids are surfaced for UX.
 *   - On hydration completion, the persisted local cart merges with the server
 *     snapshot so a returning session restores its cart even offline.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCartStore, type CartItem } from "@/context/CartStore";
import {
  getCartBuyerId,
  getRemoteCart,
  syncRemoteCart,
  validateRemoteCart,
} from "@/lib/api";

export type CartSyncError =
  | { kind: "network"; message: string }
  | { kind: "conflict"; message: string; productIds: string[] }
  | { kind: "unknown"; message: string };

interface CartSyncContextValue {
  syncing: boolean;
  error: CartSyncError | null;
  validateBeforeCheckout: () => Promise<{ ok: boolean; conflicts: string[] }>;
  flushSync: () => Promise<void>;
}

const CartSyncContext = createContext<CartSyncContextValue | null>(null);

export function useCartSync(): CartSyncContextValue {
  const ctx = useContext(CartSyncContext);
  if (!ctx) {
    throw new Error("useCartSync must be used within <CartSyncProvider>");
  }
  return ctx;
}

const SYNC_DEBOUNCE_MS = 350;
const MAX_SYNC_RETRIES = 2;

export function CartSyncProvider({ children }: { children: ReactNode }) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<CartSyncError | null>(null);

  const cart = useCartStore((s) => s.cart);
  const hydrated = useCartStore((s) => s.hydrated);
  const setCart = useCartStore((s) => s.setCart);


  const cartRef = useRef<CartItem[]>([]);
  const lastServerSnapshotRef = useRef<CartItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const mergedOnceRef = useRef(false);



  const toApiItems = (items: CartItem[]) =>
    items.map((i) => ({
      productId: i.productId,
      name: i.name,
      vendorId: i.vendorId,
      vendorName: i.vendorName,
      quantity: i.quantity,
      unitPrice: i.price,
      maxStock: i.maxStock,
    }));

  const performSyncRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const performSync = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setSyncing(true);
    setError(null);

    let attempts = 0;
    const attempt = async (): Promise<void> => {
      try {
        const snapshot = cartRef.current;
        lastServerSnapshotRef.current = snapshot;
        const res = await syncRemoteCart(toApiItems(snapshot));

        if (res.items) {
          const merged = snapshot
            .map((local) => {
              const server = res.items.find((s) => s.productId === local.productId);
              if (!server) return null;
              return {
                ...local,
                price: server.unitPrice,
                maxStock: Math.max(1, server.maxStock),
                quantity: Math.min(local.quantity, Math.max(1, server.maxStock)),
              };
            })
            .filter((x): x is CartItem => x !== null);
          lastServerSnapshotRef.current = merged;
          setCart(merged);
        }
        setError(null);
        setSyncing(false);
        inFlightRef.current = false;
        if (pendingRef.current) {
          pendingRef.current = false;
          timerRef.current = setTimeout(() => void performSyncRef.current(), 60);
        }
      } catch (err) {
        attempts += 1;
        const anyErr = err as {
          statusCode?: number;
          message?: string;
          body?: { conflictingProductIds?: string[]; message?: string };
        };
        const isConflict =
          anyErr?.statusCode === 409 || !!anyErr?.body?.conflictingProductIds;

        if (isConflict) {
          setCart(lastServerSnapshotRef.current);
          setError({
            kind: "conflict",
            message:
              anyErr?.body?.message ??
              anyErr?.message ??
              "One or more items exceeded available inventory",
            productIds: anyErr?.body?.conflictingProductIds ?? [],
          });
          setSyncing(false);
          inFlightRef.current = false;
          pendingRef.current = false;
          return;
        }

        if (attempts <= MAX_SYNC_RETRIES) {
          await new Promise((r) => setTimeout(r, 400 * attempts));
          await attempt();
          return;
        }

        setError({
          kind: "network",
          message: anyErr?.message ?? "Could not sync your cart. Please try again.",
        });
        setSyncing(false);
        inFlightRef.current = false;
        pendingRef.current = false;
      }
    };

    await attempt();
  }, [setCart]);

  useEffect(() => {
    performSyncRef.current = performSync;
  }, [performSync]);

  const scheduleSync = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void performSync(), SYNC_DEBOUNCE_MS);
  }, [performSync]);

  const flushSync = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSync();
  }, [performSync]);

  // Keep the ref in sync with the latest cart state.
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Hydration merge — exactly once, after the persisted store rehydrates.
  const hydrateFromServer = useCallback(async () => {
    if (mergedOnceRef.current) return;
    mergedOnceRef.current = true;
    try {
      const remote = await getRemoteCart();
      const remoteItems: CartItem[] = (remote.items ?? []).map((r) => ({
        productId: r.productId,
        name: r.name,
        price: r.unitPrice,
        quantity: r.quantity,
        maxStock: Math.max(1, r.maxStock),
        vendorId: r.vendorId,
        vendorName: r.vendorName,
      }));
      const localItems = cartRef.current;

      const byId = new Map(remoteItems.map((r) => [r.productId, r]));
      const merged: CartItem[] = [];
      const seen = new Set<string>();
      for (const local of localItems) {
        seen.add(local.productId);
        const remote = byId.get(local.productId);
        if (remote) {
          merged.push({
            ...local,
            price: remote.price,
            maxStock: remote.maxStock,
            quantity: Math.min(
              Math.max(local.quantity, remote.quantity),
              remote.maxStock,
            ),
          });
        } else {
          merged.push(local);
        }
      }
      for (const remote of remoteItems) {
        if (!seen.has(remote.productId)) merged.push(remote);
      }

      lastServerSnapshotRef.current = merged;
      setCart(merged);
      void flushSync();
    } catch {
      // Backend offline / unreachable — keep the persisted cart and sync later.
      if (cartRef.current.length > 0) void scheduleSync();
    }
  }, [flushSync, scheduleSync, setCart]);

  useEffect(() => {
    if (!hydrated) return;
    void hydrateFromServer();
  }, [hydrated, hydrateFromServer]);

  // Debounced sync whenever the cart changes after the initial merge.
  useEffect(() => {
    if (!hydrated || !mergedOnceRef.current) return;
    scheduleSync();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cart, hydrated, scheduleSync]);

  const validateBeforeCheckout = useCallback(async () => {
    try {
      const res = await validateRemoteCart(toApiItems(cartRef.current));
      if (res.validation?.available === false) {
        const conflicts = (res.validation.items ?? [])
          .filter((i) => i.availableQuantity < i.requestedQuantity)
          .map((i) => i.productId);
        return { ok: false, conflicts };
      }
      await flushSync();
      return { ok: true, conflicts: [] };
    } catch (err) {
      const anyErr = err as {
        statusCode?: number;
        body?: { conflictingProductIds?: string[]; message?: string };
      };
      if (anyErr?.statusCode === 409 || anyErr?.body?.conflictingProductIds) {
        setError({
          kind: "conflict",
          message:
            anyErr?.body?.message ??
            "One or more items exceeded available inventory",
          productIds: anyErr?.body?.conflictingProductIds ?? [],
        });
        return {
          ok: false,
          conflicts: anyErr?.body?.conflictingProductIds ?? [],
        };
      }
      return { ok: true, conflicts: [] };
    }
  }, [flushSync, setError]);

  return (
    <CartSyncContext.Provider
      value={{ syncing, error, validateBeforeCheckout, flushSync }}
    >
      {children}
    </CartSyncContext.Provider>
  );
}

// Re-export the session key helper so consumers stay in sync.
export { getCartBuyerId as cartBuyerId };
