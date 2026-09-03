"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, CopyCheck } from "lucide-react";
import Link from "next/link";
import { getOrderById, getAuditLogs } from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { AuditTimeline } from "@/components/admin/audit-timeline";
import type { OrderResponseDto, AuditLogEntryDto } from "@/lib/types";

function CopyChip({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2.5 py-1">
      <span className="text-xs font-medium text-text-muted">{label}:</span>
      <code className="max-w-[180px] truncate font-mono text-xs text-text-primary">{value}</code>
      <button onClick={copy} className="rounded p-0.5 hover:bg-surface-base" aria-label="Copy">
        {copied
          ? <CopyCheck className="h-3 w-3 text-accent-success" aria-hidden />
          : <Copy className="h-3 w-3 text-text-muted" aria-hidden />
        }
      </button>
    </div>
  );
}

function AdminOrderDetailInner({ orderId }: { orderId: string }) {
  const { push: toast } = useToast();
  const [order, setOrder] = useState<OrderResponseDto | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [orderData, auditData] = await Promise.all([
        getOrderById(orderId),
        getAuditLogs({ entityId: orderId, limit: 100 }),
      ]);
      setOrder(orderData);
      setAuditLogs(auditData.logs ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load order";
      setError(msg);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [orderId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Link href="/admin/orders" className="flex items-center gap-1 text-sm text-accent-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Orders
        </Link>
        <p className="text-alert-error">{error ?? "Order not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/admin/orders" className="flex w-fit items-center gap-1 text-sm text-accent-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">
            Order {order.orderNumber ?? order.id}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={order.status} />
            <CopyChip value={order.correlationId} label="Correlation ID" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated p-3 text-right text-sm shadow-sm">
          <p className="text-xs uppercase tracking-wider text-text-muted">Total</p>
          <p className="text-xl font-bold text-text-primary">
            ${order.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-text-muted">Order ID</p>
          <p className="mt-1 break-all font-mono text-xs">{order.id}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-text-muted">Buyer ID</p>
          <p className="mt-1 break-all font-mono text-xs">{order.buyerId}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-text-muted">Created</p>
          <p className="mt-1 text-sm font-medium">{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-text-muted">Updated</p>
          <p className="mt-1 text-sm font-medium">{new Date(order.updatedAt).toLocaleString()}</p>
        </div>
      </div>

      {order.shippingAddress && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-text-muted">Shipping Address</h2>
          <p className="text-sm">{order.shippingAddress}</p>
        </div>
      )},

      <div className="rounded-lg border border-border bg-surface-elevated shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Line Items ({order.lineItems.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-base text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Product</th>
                <th className="px-4 py-2 text-left font-medium">Vendor</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Vendor Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.lineItems.map(li => (
                <tr key={li.id} className="hover:bg-surface-base">
                  <td className="px-4 py-2">{li.productName}</td>
                  <td className="px-4 py-2 text-text-muted">{li.vendorName}</td>
                  <td className="px-4 py-2 text-right">{li.quantity}</td>
                  <td className="px-4 py-2 text-right">${li.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-medium">${li.lineTotal.toFixed(2)}</td>
                  <td className="px-4 py-2"><StatusBadge status={li.fulfillmentStatus} size="sm" /></td>
                  <td className="px-4 py-2 font-mono text-xs text-text-muted">{li.vendorReference ?? <span>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">Audit Timeline</h2>
        <AuditTimeline entries={auditLogs} />
      </div>
    </div>
  );
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ToastProvider>
      <AdminOrderDetailInner orderId={id} />
    </ToastProvider>
  );
}