/**
 * Recently Viewed store — localStorage-backed, session-scoped.
 * Uses real product IDs only; no mock data.
 */
import { useState, useEffect, useCallback } from "react";
import type { ProductDto } from "@/lib/types";

const STORAGE_KEY = "mp-recently-viewed";
const MAX_ITEMS = 8;

export interface RecentlyViewItem {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  vendorName?: string;
  viewedAt: number;
}

function readStorage(): RecentlyViewItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: RecentlyViewItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // ignore storage errors
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewItem[]>([]);

  useEffect(() => {
    setItems(readStorage());
  }, []);

  const add = useCallback((product: ProductDto) => {
    const next: RecentlyViewItem[] = [
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.images?.[0] ?? undefined,
        vendorName: product.vendorName ?? undefined,
        viewedAt: Date.now(),
      },
      ...readStorage().filter((i) => i.productId !== product.id),
    ];
    writeStorage(next);
    setItems(next.slice(0, MAX_ITEMS));
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setItems([]);
  }, []);

  return { items, add, clear };
}
