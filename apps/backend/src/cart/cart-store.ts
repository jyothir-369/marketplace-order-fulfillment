import { Injectable, Logger } from '@nestjs/common';
import { CartItemDto } from './dto/cart.dto';

/**
 * Session-keyed cart store.
 *
 * v1 ships an in-memory Map scoped to the process lifetime (session-cart).
 * Swap `CartStore` for a Redis/Postgres-backed implementation without
 * touching controllers when auth/user carts land.
 */
@Injectable()
export class CartStore {
  private readonly logger = new Logger(CartStore.name);
  private readonly carts = new Map<string, CartItemDto[]>();

  get(buyerId: string): Promise<CartItemDto[]> {
    return Promise.resolve(this.carts.get(buyerId) ?? []);
  }

  set(buyerId: string, items: CartItemDto[]): Promise<CartItemDto[]> {
    this.carts.set(buyerId, items);
    return Promise.resolve(items);
  }

  delete(buyerId: string): Promise<void> {
    this.carts.delete(buyerId);
    return Promise.resolve();
  }
}
