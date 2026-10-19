/**
 * use-wishlist — client-side wishlist state backed by localStorage (V2 Premium).
 *
 * Uses the same Zustand + persist pattern as CartStore so the wishlist survives
 * page reloads and is SSR-safe via the `hydrated` flag.
 *
 * localStorage key: marketplace.wishlist.v1
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { userWishlistKey, guestWishlistKey } from "@/lib/auth-storage-keys";

let activeWishlistUserId: string | null = null;
let suppressWishlistStorageWrites = false;

function currentWishlistStorageKey(): string {
  return activeWishlistUserId ? userWishlistKey(activeWishlistUserId) : guestWishlistKey();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WishlistState {
  /** Array of saved product IDs. */
  items: string[];
  /** False on the server and first render; true after localStorage rehydration. */
  hydrated: boolean;

  // Actions
  toggleWishlist: (productId: string) => void;
  clearWishlist: () => void;
  markHydrated: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      markHydrated: () => set({ hydrated: true }),

      toggleWishlist: (productId) =>
        set((state) => {
          const exists = state.items.includes(productId);
          return {
            items: exists
              ? state.items.filter((id) => id !== productId)
              : [...state.items, productId],
          };
        }),

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: currentWishlistStorageKey(),
      storage: createJSONStorage(() => ({
        getItem: (_name: string) =>
          typeof window !== "undefined" ? window.localStorage.getItem(currentWishlistStorageKey()) : null,
        setItem: (_name: string, value: string) => {
          if (typeof window !== "undefined" && !suppressWishlistStorageWrites) {
            window.localStorage.setItem(currentWishlistStorageKey(), value);
          }
        },
        removeItem: (_name: string) => {
          if (typeof window !== "undefined" && !suppressWishlistStorageWrites) {
            window.localStorage.removeItem(currentWishlistStorageKey());
          }
        },
      })),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);

export function activateWishlistUser(userId: string | null): void {
  const nextUserId = userId?.trim() || null;
  if (nextUserId === activeWishlistUserId) return;

  suppressWishlistStorageWrites = true;
  try {
    useWishlistStore.setState({ items: [], hydrated: false });
    activeWishlistUserId = nextUserId;
    useWishlistStore.persist.rehydrate();
  } finally {
    suppressWishlistStorageWrites = false;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the current wishlist as an array of product IDs. */
export const selectWishlistItems = (state: WishlistState) => state.items;

/** Returns the number of saved items. */
export const selectWishlistCount = (state: WishlistState) => state.items.length;

/** Returns `true` if the given productId is in the wishlist. */
export const selectIsWishlisted = (productId: string) => (state: WishlistState) =>
  state.items.includes(productId);

/**
 * Returns `true` once the wishlist store has rehydrated from localStorage.
 * Gate wishlist-dependent UI on this to avoid SSR hydration mismatches.
 */
export const selectWishlistHydrated = (state: WishlistState) => state.hydrated;
