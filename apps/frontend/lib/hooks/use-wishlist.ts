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
      name: "marketplace.wishlist.v1",
      storage: createJSONStorage(() =>
        // Guard against SSR environments where `window` is undefined.
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as never)
      ),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);

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
