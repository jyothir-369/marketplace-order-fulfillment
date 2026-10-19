import { describe, it, expect, beforeEach } from '@jest/globals';
import { activateCartUser, useCartStore } from "@/context/CartStore";

describe('Cart isolation regression — two users + logout + persistence', () => {
  beforeEach(() => { activateCartUser(null); useCartStore.setState({ cart: [], hydrated: false, drawerOpen: false }); });
  it('two-account: A sees A; B sees B; never cross-leak', () => {
    activateCartUser('A'); useCartStore.setState({ cart: [{ productId: 'a', name: 'A', price: 1, quantity: 1, maxStock: 1, vendorId: 'v', vendorName: 'V' }], hydrated: true });
    activateCartUser('B'); expect(useCartStore.getState().cart.find(i => i.productId === 'a')).toBeUndefined();
  });
  it('guest isolated; no auto-merge', () => {
    activateCartUser(null); expect(useCartStore.getState().cart).toEqual([]);
  });
  it('refresh preserves identity on same user', () => {
    activateCartUser('U'); useCartStore.getState().addToCart({ productId: 'p', name: 'P', price: 2, quantity: 1, maxStock: 1, vendorId: 'v', vendorName: 'V' });
    const len = useCartStore.getState().cart.length;
    activateCartUser('U'); expect(useCartStore.getState().cart.length).toBe(len);
  });
});
