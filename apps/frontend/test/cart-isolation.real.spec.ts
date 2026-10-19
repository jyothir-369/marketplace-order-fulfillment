/** @jest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { activateCartUser, useCartStore } from "../context/CartStore";
import { activateWishlistUser, useWishlistStore } from "../lib/hooks/use-wishlist";
import { userCartKey, guestCartKey, userWishlistKey, guestWishlistKey } from "../lib/auth-storage-keys";

function storedState(key: string): any {
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw).state : null;
}

beforeEach(() => {
  activateCartUser(null);
  activateWishlistUser(null);
  useCartStore.setState({ cart: [], hydrated: false, drawerOpen: false });
  useWishlistStore.setState({ items: [], hydrated: false });
  window.localStorage.clear();
});

afterEach(() => {
  activateCartUser(null);
  activateWishlistUser(null);
  window.localStorage.clear();
});

describe("real cart and wishlist storage account isolation", () => {
  it("restores A's cart without exposing it to B", () => {
    activateCartUser("account-A");
    useCartStore.getState().addToCart({
      productId: "product-A", name: "A item", price: 10, quantity: 1,
      maxStock: 10, vendorId: "vendor-1", vendorName: "Vendor",
    });

    expect(storedState(userCartKey("account-A")).cart[0].productId).toBe("product-A");

    activateCartUser("account-B");
    expect(useCartStore.getState().cart).toEqual([]);

    useCartStore.getState().addToCart({
      productId: "product-B", name: "B item", price: 20, quantity: 1,
      maxStock: 10, vendorId: "vendor-2", vendorName: "Vendor",
    });
    expect(storedState(userCartKey("account-B")).cart[0].productId).toBe("product-B");

    activateCartUser("account-A");
    expect(useCartStore.getState().cart.map((item) => item.productId)).toEqual(["product-A"]);
  });

  it("restores A's wishlist without exposing it to B", () => {
    activateWishlistUser("account-A");
    useWishlistStore.getState().toggleWishlist("wish-A");
    expect(storedState(userWishlistKey("account-A")).items).toEqual(["wish-A"]);

    activateWishlistUser("account-B");
    expect(useWishlistStore.getState().items).toEqual([]);
    useWishlistStore.getState().toggleWishlist("wish-B");
    expect(storedState(userWishlistKey("account-B")).items).toEqual(["wish-B"]);

    activateWishlistUser("account-A");
    expect(useWishlistStore.getState().items).toEqual(["wish-A"]);
  });

  it("keeps guest data separate from signed-in users", () => {
    activateCartUser(null);
    useCartStore.getState().addToCart({
      productId: "guest-item", name: "Guest item", price: 5, quantity: 1,
      maxStock: 5, vendorId: "vendor-g", vendorName: "Guest vendor",
    });
    expect(storedState(guestCartKey()).cart[0].productId).toBe("guest-item");

    activateCartUser("account-A");
    expect(useCartStore.getState().cart).toEqual([]);
    activateCartUser(null);
    expect(useCartStore.getState().cart.map((item) => item.productId)).toEqual(["guest-item"]);

    activateWishlistUser(null);
    useWishlistStore.getState().toggleWishlist("guest-wish");
    expect(storedState(guestWishlistKey()).items).toEqual(["guest-wish"]);

    activateWishlistUser("account-A");
    expect(useWishlistStore.getState().items).toEqual([]);
    activateWishlistUser(null);
    expect(useWishlistStore.getState().items).toEqual(["guest-wish"]);
  });
});