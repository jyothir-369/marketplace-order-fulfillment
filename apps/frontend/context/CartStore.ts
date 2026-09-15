/**
 * CartStore — client-side cart state using Zustand with `persist` middleware (§3.1).
 *
 * SSR safety (GAP-F7 / F10):
 *  - `hydrated` is `false` on the server and the very first render on the client.
 *  - Components should gate cart-dependent rendering (e.g. cart counter in
 *    the header) on `hydrated === true` to avoid hydration mismatch warnings.
 *
 * Vendor sub-groups:
 *  - CartItem carries `vendorId` + `vendorName` so a multi-vendor cart can
 *    be grouped by vendor at checkout time.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
  vendorId: string;
  vendorName: string;
}

export interface CartVendorGroup {
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

interface CartState {
  cart: CartItem[];
  hydrated: boolean;
  drawerOpen: boolean;

  // Actions
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  markHydrated: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: [],
      hydrated: false,
      drawerOpen: false,

      markHydrated: () => set({ hydrated: true }),

      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((i) => i.productId === item.productId);
          if (existing) {
            const newQty = Math.min(existing.quantity + item.quantity, item.maxStock);
            return {
              cart: state.cart.map((i) =>
                i.productId === item.productId ? { ...i, quantity: newQty } : i
              ),
              drawerOpen: true,
            };
          }
          return {
            cart: [
              ...state.cart,
              {
                ...item,
                quantity: Math.min(item.quantity, item.maxStock),
              },
            ],
            drawerOpen: true,
          };
        }),

      // Price/stock validation guard: refuse to add if out of stock (Phase 6)
      if (item.maxStock <= 0) {
        return state;
      }

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cart: state.cart
            .map((i) =>
              i.productId === productId
                ? {
                    ...i,
                    quantity: Math.max(0, Math.min(quantity, i.maxStock)),
                  }
                : i
            )
            // Drop items whose quantity fell to 0
            .filter((i) => i.quantity > 0),
        })),

      clearCart: () => set({ cart: [] }),

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
    }),
    {
      name: "marketplace_cart_store",
      storage: createJSONStorage(() =>
        // Guard against SSR environments where `window` is undefined.
        typeof window !== "undefined" ? window.localStorage : (undefined as never)
      ),
      // Drawer UI state should never be persisted; only the cart contents.
      partialize: (state) => ({ cart: state.cart }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectCart = (state: CartState) => state.cart;
export const selectHydrated = (state: CartState) => state.hydrated;
export const selectDrawerOpen = (state: CartState) => state.drawerOpen;

export const selectTotalItems = (state: CartState): number =>
  state.cart.reduce((sum, item) => sum + item.quantity, 0);

export const selectTotalAmount = (state: CartState): number =>
  state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const selectItemCount = (productId: string) => (state: CartState): number => {
  const item = state.cart.find((i) => i.productId === productId);
  return item?.quantity ?? 0;
};

/**
 * Group cart items by vendor — useful at checkout when an order splits
 * into per-vendor fulfillment workstreams.
 */
export const selectCartVendorGroups = (state: CartState): CartVendorGroup[] => {
  const map = new Map<string, CartVendorGroup>();
  for (const item of state.cart) {
    const existing = map.get(item.vendorId);
    if (existing) {
      existing.items.push(item);
      existing.subtotal += item.price * item.quantity;
      existing.itemCount += item.quantity;
    } else {
      map.set(item.vendorId, {
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        items: [item],
        subtotal: item.price * item.quantity,
        itemCount: item.quantity,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.vendorName.localeCompare(b.vendorName)
  );
};
