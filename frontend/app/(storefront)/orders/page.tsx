/**
 * app/(storefront)/orders/page.tsx — Buyer order history (§3).
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { getOrdersForBuyer } from "@/lib/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { OrderResponseDto } from "@/lib/types";

const BUYER_ID = "00000000-0000-0000-0000-000000000001";

interface OrderRowProps {
  order: OrderResponseDto;
}

function OrderRow({ order }: OrderRowProps) {
  const itemCount = order.lineItems.length;
  const totalQty = order.lineItems.reduce((sum, li) => sum + li.quantity, 0);

  return (
    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent)]/30 transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/orders/${order.id}`}
          className="text-sm font-mono font-medium text-[var(--color-primary)] hover:underline"
        >
          {order.orderNumber ?? order.id.slice(0, 8)}
        </Link>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={order.status} size="sm" />
      </td>
      <td className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
        {itemCount} item{itemCount !== 1 ? "s" : ""} ({totalQty} unit{totalQty !== 1 ? "s" : ""})
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
          {formatCurrency(order.totalAmount)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">
        {formatRelativeTime(order.createdAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/orders/${order.id}`}
          className="text-sm text-[var(--color-info)] hover:underline"
        >
          View
        </Link>
      </td>
    </tr>
  );
}

function OrderTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-muted)]">
            <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-muted-foreground)]">Order</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-muted-foreground)]">Status</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-muted-foreground)]">Items</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-muted-foreground)]">Total</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-muted-foreground)]">Placed</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-[var(--color-muted-foreground)]" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-t border-[var(--color-border)]">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton height="1rem" width={j === 4 ? "4rem" : "6rem"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrdersForBuyer(BUYER_ID)
      .then((data) => {
        if (cancelled) return;
        setOrders([...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        setHasLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">My Orders</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
          {loading
            ? "Loading\u2026"
            : hasLoaded
              ? `${orders.length} order${orders.length !== 1 ? "s" : ""}`
              : ""}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-4 text-sm font-medium"
        >
          {error}
        </div>
      )}

      {loading ? (
        <OrderTableSkeleton />
      ) : hasLoaded && orders.length === 0 ? (
        <EmptyState
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          }
          title="No orders yet"
          description="Place an order from the catalog to see it here."
          action={
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
            >
              Browse catalog
            </Link>
          }
        />
      ) : (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm" aria-label="Order history">
            <thead>
              <tr className="bg-[var(--color-muted)] border-b border-[var(--color-border)]">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)]">Order</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)]">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-muted-foreground)]">Items</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--color-muted-foreground)]">Total</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--color-muted-foreground)]">Placed</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--color-muted-foreground)]" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
