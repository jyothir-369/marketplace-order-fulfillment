/**
 * app/(storefront)/orders/[id]/page.tsx — Order confirmation & live tracking (§2.2, §3.2, §4.1, GAP-F1/F6).
 *
 * Features:
 *   - useOrderPolling hook (stops on terminal status)
 *   - Order header with StatusBadge
 *   - PollingIndicator (live pulse when polling)
 *   - Vendor-grouped line items with StatusBadge per item
 *   - AMBIGUOUS / DEAD_LETTER alert banners (semantic colors untouched)
 *   - Defensive: order.lineItems ?? [] on all renders
 *
 * V2 Premium treatment:
 *   - Brass editorial eyebrow + serif H1 (Playfair Display)
 *   - Warm hairline borders, ivory card surfaces
 *   - Status badges untouched (semantic vocabulary)
 *   - Warm-toned alert banners keep semantic colors (amber/red) but V2 chrome
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useOrderPolling } from "@/lib/hooks/use-order-polling";
import { StatusBadge } from "@/components/ui/status-badge";
import { PollingIndicator } from "@/components/order/PollingIndicator";
import { OrderDetailSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, cn } from "@/lib/utils";

const DEAD_LETTER_STATUSES = new Set(["dead_letter", "DEAD_LETTER", "FAILED"]);
const AMBIGUOUS_STATUSES = new Set(["AMBIGUOUS", "ambiguous"]);

function hasDeadLetterLineItem(lineItems: { fulfillmentStatus: string }[]): boolean {
  return lineItems.some((li) => DEAD_LETTER_STATUSES.has(li.fulfillmentStatus));
}

function hasAmbiguousLineItem(lineItems: { fulfillmentStatus: string }[]): boolean {
  return lineItems.some((li) => AMBIGUOUS_STATUSES.has(li.fulfillmentStatus));
}

export default function OrderConfirmationPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";

  const { data: order, error, isLoading, isFetching, dataUpdatedAt, isTerminal } =
    useOrderPolling({ orderId, enabled: Boolean(orderId) });

  if (!orderId) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <EmptyState
          title="Order not found"
          description="No order ID was provided."
          action={
            <Link
              href="/products"
              className="px-5 py-2.5 rounded-md font-semibold bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity shadow-v2"
            >
              Back to Catalog
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) return <OrderDetailSkeleton />;

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <EmptyState
          icon={<AlertTriangle size={48} aria-hidden />}
          title="Order not found"
          description={error?.message ?? "This order does not exist or could not be loaded."}
          action={
            <Link
              href="/products"
              className="px-5 py-2.5 rounded-md font-semibold bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity shadow-v2"
            >
              Back to Catalog
            </Link>
          }
        />
      </div>
    );
  }

  const lineItems = order.lineItems ?? [];
  const hasDLQ = hasDeadLetterLineItem(lineItems);
  const hasAmbiguous = hasAmbiguousLineItem(lineItems);

  // Group line items by vendor
  const vendorGroups = lineItems.reduce<
    Map<string, { vendorName: string; items: typeof lineItems }>
  >((acc, li) => {
    const key = li.vendorId;
    if (!acc.has(key)) acc.set(key, { vendorName: li.vendorName, items: [] });
    acc.get(key)!.items.push(li);
    return acc;
  }, new Map());

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            aria-hidden
            className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent)] mb-1"
          >
            Order confirmation
          </p>
          <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)]">
            Thank you for your order
          </h1>
          <p className="text-sm text-[var(--color-warm-muted)] mt-1">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={order.status} />
          <PollingIndicator isPolling={isFetching && !isTerminal} lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null} />
        </div>
      </div>

      {/* Order metadata */}
      <div className="bg-[var(--color-card)] border border-[var(--color-warm-border)] rounded-2xl p-5 text-sm text-[var(--color-warm-muted)] grid grid-cols-1 sm:grid-cols-2 gap-3 shadow-v2">
        <div>
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)] mb-0.5">Order #</span>
          <span className="font-mono font-semibold text-[var(--color-foreground)]">{order.orderNumber ?? order.id}</span>
        </div>
        <div>
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)] mb-0.5">Total</span>
          <span className="font-display text-lg font-semibold text-[var(--color-foreground)]">{formatCurrency(order.totalAmount)}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)] mb-0.5">Shipping to</span>
          {order.shippingAddress ? (
            <span className="text-[var(--color-foreground)]">{order.shippingAddress}</span>
          ) : (
            <span className="italic text-[var(--color-warm-subtle)]">Not provided</span>
          )}
        </div>
        <div className="sm:col-span-2">
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)] mb-0.5">Correlation ID</span>
          <span className="font-mono text-xs text-[var(--color-foreground)]">{order.correlationId}</span>
        </div>
      </div>

      {/* AMBIGUOUS alert — semantic amber, V2 chrome */}
      {hasAmbiguous && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 p-4 rounded-2xl",
            "bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/40"
          )}
        >
          <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Pending vendor confirmation
            </p>
            <p className="text-sm text-[var(--color-warm-muted)] mt-0.5">
              One or more items are waiting for vendor confirmation. Your order is not
              at risk — we are actively reconciling with the vendor. Check back shortly.
            </p>
          </div>
        </div>
      )}

      {/* DEAD_LETTER alert — semantic red, V2 chrome */}
      {hasDLQ && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 p-4 rounded-2xl",
            "bg-[var(--color-destructive)]/10 border border-[var(--color-destructive)]/40"
          )}
        >
          <AlertTriangle className="h-5 w-5 text-[var(--color-destructive)] shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              A fulfillment issue was detected
            </p>
            <p className="text-sm text-[var(--color-warm-muted)] mt-0.5">
              One or more items could not be fulfilled. Our team is reviewing this
              and will update you shortly. Contact support if you need urgent help.
            </p>
          </div>
        </div>
      )}

      {/* Line items grouped by vendor */}
      {Array.from(vendorGroups.entries()).map(([vendorId, group]) => (
        <div
          key={vendorId}
          className="bg-[var(--color-card)] border border-[var(--color-warm-border)] rounded-2xl overflow-hidden shadow-v2"
        >
          <div className="bg-[var(--color-ivory)] border-b border-[var(--color-warm-border)] px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)]">
              {group.vendorName}
            </span>
            <span className="text-xs text-[var(--color-warm-muted)] font-mono">
              {group.items.length} item{group.items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--color-warm-muted)] border-b border-[var(--color-warm-border)]">
                <th className="p-3">Item</th>
                <th className="p-3 w-16 text-center">Qty</th>
                <th className="p-3 w-24 text-right">Total</th>
                <th className="p-3 w-36">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-warm-border)]">
              {group.items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="p-3">
                    <div className="font-medium text-[var(--color-foreground)]">{item.productName}</div>
                    <div className="text-xs text-[var(--color-warm-muted)] mt-0.5">
                      each
                    </div>
                    {item.failureReason && (
                      <div className="text-xs text-[var(--color-destructive)] mt-1">
                        {item.failureReason}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center tabular-nums text-[var(--color-foreground)]">{item.quantity}</td>
                  <td className="p-3 text-right font-medium tabular-nums text-[var(--color-foreground)]">
                    {formatCurrency(item.lineTotal)}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={item.fulfillmentStatus} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Footer actions */}
      <div className="flex items-center justify-between text-sm pt-2">
        <Link
          href="/products"
          className="text-sm font-semibold text-[var(--color-accent)] hover:text-[var(--color-foreground)] transition-colors"
        >
          Continue shopping
        </Link>
        {isTerminal && (
          <span className="text-xs text-[var(--color-warm-muted)]">
            Status updates stopped (order is {order.status.toLowerCase()}).
          </span>
        )}
      </div>
    </div>
  );
}
