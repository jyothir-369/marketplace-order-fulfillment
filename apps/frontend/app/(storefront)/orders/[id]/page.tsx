/**
 * app/(storefront)/orders/[id]/page.tsx — Order confirmation & live tracking (§2.2, §3.2, §4.1, GAP-F1/F6).
 *
 * Features:
 *   - useOrderPolling hook (stops on terminal status)
 *   - Order header with StatusBadge
 *   - PollingIndicator (live pulse when polling)
 *   - Vendor-grouped line items with StatusBadge per item
 *   - AMBIGUOUS / DEAD_LETTER alert banners
 *   - Defensive: order.lineItems ?? [] on all renders
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, Package } from "lucide-react";
import { useOrderPolling } from "@/lib/hooks/use-order-polling";
import { StatusBadge } from "@/components/ui/status-badge";
import { PollingIndicator } from "@/components/order/PollingIndicator";
import { OrderDetailSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";

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
              className="px-5 py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
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
              className="px-5 py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700"
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
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Order Confirmation</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={order.status} />
          <PollingIndicator isPolling={isFetching && !isTerminal} lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null} />
        </div>
      </div>

      {/* Order metadata */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 text-sm text-zinc-600 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <span className="font-medium text-zinc-700">Order #:</span>{" "}
          <span className="font-mono font-semibold">{order.orderNumber ?? order.id}</span>
        </div>
        <div>
          <span className="font-medium text-zinc-700">Total:</span>{" "}
          <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="font-medium text-zinc-700">Shipping to:</span>{" "}
          {order.shippingAddress ? (
            <span>{order.shippingAddress}</span>
          ) : (
            <span className="italic text-zinc-400">Not provided</span>
          )}
        </div>
        <div className="sm:col-span-2">
          <span className="font-medium text-zinc-700">Correlation ID:</span>{" "}
          <span className="font-mono text-xs">{order.correlationId}</span>
        </div>
      </div>

      {/* AMBIGUOUS alert */}
      {hasAmbiguous && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-300"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Pending vendor confirmation
            </p>
            <p className="text-sm text-amber-800 mt-0.5">
              One or more items are waiting for vendor confirmation. Your order is not
              at risk — we are actively reconciling with the vendor. Check back shortly.
            </p>
          </div>
        </div>
      )}

      {/* DEAD_LETTER alert */}
      {hasDLQ && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-300"
        >
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-red-900">
              A fulfillment issue was detected
            </p>
            <p className="text-sm text-red-800 mt-0.5">
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
          className="bg-white border border-zinc-200 rounded-lg overflow-hidden"
        >
          <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-700">
              {group.vendorName}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              {group.items.length} item{group.items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b">
                <th className="p-3 font-medium">Item</th>
                <th className="p-3 font-medium w-16 text-center">Qty</th>
                <th className="p-3 font-medium w-24 text-right">Total</th>
                <th className="p-3 font-medium w-36">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {group.items.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="p-3">
                    <div className="font-medium text-zinc-900">{item.productName}</div>
                    <div className="text-xs text-zinc-400">
                       each
                    </div>
                    {item.failureReason && (
                      <div className="text-xs text-red-600 mt-1">
                        {item.failureReason}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-right font-medium">
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
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/products"
          className="text-indigo-600 hover:underline"
        >
          Continue shopping
        </Link>
        {isTerminal && (
          <span className="text-zinc-500">
            Status updates stopped (order is {order.status.toLowerCase()}).
          </span>
        )}
      </div>
    </div>
  );
}