/**
 * app/(operational)/admin/orders/page.tsx — Admin Fulfillment Data Table (§4.3).
 *
 * Renders FulfillmentDataTable with columns for:
 *   Order ID, Status, Line Items count, Created, Stuck indicator
 * Plus: expand row for per-line-item detail + ResolveLineItemDialog.
 */

"use client";

import { useEffect, useState } from "react";
import { getAdminOrders } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { FulfillmentDataTable, type FulfillmentColumnDef } from "@/components/operational/FulfillmentDataTable";
import { ResolveLineItemDialog } from "@/components/admin/resolve-line-item-dialog";
import type { AdminOrderDto, AdminOrderLineItemDto } from "@/lib/types";
import { formatRelativeTime, cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "PLACED", label: "Placed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "FULFILLING", label: "Fulfilling" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "FAILED", label: "Failed" },
];

function AdminOrdersInner() {
  const { push: toast } = useToast();
  const [orders, setOrders] = useState<AdminOrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [stuckFilter, setStuckFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [resolveTarget, setResolveTarget] = useState<{ lineItemId: string; orderId: string } | null>(null);

  const PAGE_SIZE = 20;

  const load = async (pageNum: number) => {
    setLoading(true);
    try {
      const data = await getAdminOrders({
        status: statusFilter === "all" ? undefined : statusFilter,
        type: stuckFilter ? "stuck" : "all",
        limit: PAGE_SIZE,
        offset: (pageNum - 1) * PAGE_SIZE,
      });
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, stuckFilter]);

  useEffect(() => {
    void load(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const columns: FulfillmentColumnDef<AdminOrderDto>[] = [
    {
      id: "orderId",
      header: "Order ID",
      accessorKey: "orderId",
      mono: true,
    },
    {
      id: "status",
      header: "Status",
      statusKey: "status",
    },
    {
      id: "lineItems",
      header: "Items",
      accessorKey: "lineItems",
      cell: (row) => (
        <span className="tabular-nums">{row.lineItems.length}</span>
      ),
      align: "right",
    },
    {
      id: "stuckReason",
      header: "Flag",
      accessorKey: "stuckReason",
      cell: (row) =>
        row.stuckReason ? (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-warning)]">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            {row.stuckReason}
          </span>
        ) : (
          <span className="text-[var(--color-muted-foreground)]">—</span>
        ),
    },
    {
      id: "createdAt",
      header: "Created",
      accessorKey: "createdAt",
      cell: (row) => (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {formatRelativeTime(row.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      disableSort: true,
      cell: () => null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">All Orders</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] tabular-nums">
          {total} total
        </p>
      </div>

      {/* Filters */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
          "border-[var(--color-border)] bg-[var(--color-card)]"
        )}
      >
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <input
            type="checkbox"
            checked={stuckFilter}
            onChange={(e) => {
              setStuckFilter(e.target.checked);
              setPage(1);
            }}
            className="accent-[var(--color-primary)]"
          />
          Stuck only
        </label>
      </div>

      {/* Table */}
      <FulfillmentDataTable
        data={orders}
        columns={columns}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => setPage(p)}
        loading={loading}
        emptyState="No orders match the current filters."
        getRowId={(row) => row.orderId}
      />

      {resolveTarget && (
        <ResolveLineItemDialog
          lineItemId={resolveTarget.lineItemId}
          orderId={resolveTarget.orderId}
          onClose={() => setResolveTarget(null)}
          onResolved={() => {
            setResolveTarget(null);
            void load(page);
          }}
        />
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return <AdminOrdersInner />;
}
