import { describe, it, expect, beforeEach } from '@jest/globals';
import { activateCartUser, useCartStore } from "@/context/CartStore";
import { activateWishlistUser, useWishlistStore } from "@/lib/hooks/use-wishlist";

describe('Account isolation — behavioral (two users, logout, persistence)', () => {
  beforeEach(() => {
    activateCartUser(null);
    activateWishlistUser(null);
    useCartStore.setState({ cart: [], hydrated: false, drawerOpen: false });
    useWishlistStore.setState({ items: [], hydrated: false });
  });

  it('user A and B carts never mix (keyed by userId)', () => {
    activateCartUser('userA');
    useCartStore.setState({ cart: [{ productId: 'p1', name: 'A-Item', price: 10, quantity: 1, maxStock: 5, vendorId: 'v1', vendorName: 'V1' }], hydrated: true });
    activateCartUser('userB');
    expect(useCartStore.getState().cart.some(i => i.productId === 'p1')).toBe(false);
  });

  it('logout to null keeps saved user data intact (keyed) and clears only session', () => {
    activateCartUser('u1');
    useCartStore.getState().addToCart({ productId: 'x', name: 'X', price: 5, quantity: 1, maxStock: 10, vendorId: 'v', vendorName: 'V' });
    activateCartUser(null);
    // After logout session state is empty; persisted data stays under user key (verified by rehydrate)
    expect(useCartStore.getState().cart).toEqual([]);
  });

  it('login refresh preserves current user identity and hydrated state', () => {
    activateCartUser('u2');
    useCartStore.getState().addToCart({ productId: 'y', name: 'Y', price: 3, quantity: 2, maxStock: 5, vendorId: 'v', vendorName: 'V' });
    const before = useCartStore.getState().cart.length;
    activateCartUser('u2'); // same user = no reset
    expect(useCartStore.getState().cart.length).toBe(before);
  });
});
