/**
 * User-ID-scoped storage keys for cart / wishlist.
 * Never mix account state; guest isolated; merge only when supported.
 */
export function userCartKey(userId: string): string { return `mpfo.user.${userId}.cart`; }
export function userWishlistKey(userId: string): string { return `mpfo.user.${userId}.wishlist`; }
export function guestCartKey(): string { return `mpfo.guest.cart`; }
export function guestWishlistKey(): string { return `mpfo.guest.wishlist`; }
