"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X, AlertTriangle, RefreshCw } from "lucide-react";
import {
  Product,
  getVendorProducts,
  adjustStock,
  deleteProduct,
  createProduct,
} from "@/lib/api";
import { useVendorId } from "@/lib/hooks/use-vendor-id";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface NewProductForm {
  name: string;
  price: number;
  stockCount: number;
}

const emptyForm: NewProductForm = { name: "", price: 0, stockCount: 0 };

function stockStatus(p: Product): { label: string; tone: "success" | "warning" | "danger"; cls: string } {
  if (p.stockCount === 0) return { label: "Out of Stock", tone: "danger", cls: "text-[var(--color-destructive)]" };
  if (p.stockCount <= 5) return { label: "Low Stock", tone: "warning", cls: "text-[var(--color-warning)]" };
  return { label: "In Stock", tone: "success", cls: "text-[var(--color-success)]" };
}

function InventoryInner() {
  const { push: toast } = useToast();
  // Phase 3.1/3.2: the tenant comes from the session — the backend forces
  // product writes onto the caller's vendor and rejects other-vendor reads.
  const vendorId = useVendorId();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NewProductForm>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  const refresh = async () => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getVendorProducts(vendorId, true);
      setProducts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load inventory";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [vendorId]);

  /**
   * Stock changes go through the audited inventory endpoint
   * (POST /inventory/:productId/adjust), not PATCH /catalog/:id — the catalog
   * write path rejects vendor stockCount changes (it requires the audited
   * delta endpoint). The delta is computed from the confirmed persisted
   * quantity so the server stays the source of truth.
   */
  const saveStock = async (productId: string) => {
    const raw = editing[productId];
    if (raw === undefined || raw === "") {
      toast("Stock value is required.", "error");
      return;
    }
    const next = parseInt(raw, 10);
    if (Number.isNaN(next) || next < 0) {
      toast("Stock must be a non-negative number.", "error");
      return;
    }
    const current = products.find((p) => p.id === productId);
    if (!current) {
      toast("This item is no longer in your inventory. Refresh and try again.", "error");
      return;
    }
    const delta = next - current.stockCount;
    if (delta === 0) {
      setEditing((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    setSavingId(productId);
    try {
      const result = await adjustStock(productId, {
        delta,
        reason: delta > 0 ? "Vendor restock" : "Vendor stock reduction",
      });
      if (!result.success) {
        toast(result.message || "Stock update was rejected by the server.", "error");
        setEditing((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
        void refresh();
        return;
      }
      // Apply the server-confirmed value so the row, the status badge and the
      // low/out-of-stock counts all reflect what was actually persisted.
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, stockCount: result.newStock } : p
        )
      );
      setEditing((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      toast("Stock updated for " + current.name, "success");
    } catch (err) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : 0;
      if (statusCode === 409) {
        setEditing((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
        void refresh();
        toast("This item was updated elsewhere. Server value has been refreshed.", "warning");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to update stock";
        toast(msg, "error");
      }
    } finally {
      setSavingId(null);
    }
  };

  /**
   * Deactivate (soft delete) a product. The backend deactivates rather than
   * hard-deletes so existing order history stays referentially intact.
   */
  const removeProduct = async (product: Product) => {
    const confirmed = window.confirm(
      `Deactivate "${product.name}"? It will no longer appear in the public catalogue. Existing order history will be preserved.`
    );
    if (!confirmed) return;
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast(`Deactivated ${product.name}`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to deactivate product";
      toast(msg, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast("Name is required.", "error"); return; }
    if (form.price < 0 || form.stockCount < 0) { toast("Price and stock must be non-negative.", "error"); return; }
    setCreating(true);
    try {
      const created = await createProduct({
        vendorId: vendorId ?? "",
        name: form.name.trim(),
        price: form.price,
        stockCount: form.stockCount,
      });
      setProducts((prev) => [created, ...prev]);
      setForm(emptyForm);
      setModalOpen(false);
      toast("Created " + created.name, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create product";
      toast(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  const filtered = products.filter(
    (p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase())
  );

  const nonZeroStock = products.filter((p) => p.stockCount > 0).length;
  const outOfStock = products.length - nonZeroStock;
  const lowStock = products.filter((p) => p.stockCount > 0 && p.stockCount <= 5).length;

  const inputBase =
    "w-full rounded border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Inventory</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {loading
              ? "Loading..."
              : `${products.length} products · ${nonZeroStock} in stock · ${lowStock} low stock · ${outOfStock} out of stock`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm",
              "border border-[var(--color-border)] bg-[var(--color-card)]",
              "text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm font-medium",
              "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
              "hover:opacity-90"
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> New Product
          </button>
        </div>
      </header>

      {error && (
        <div
          className={cn(
            "flex items-start justify-between gap-3 rounded border p-3 text-sm",
            "border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5",
            "text-[var(--color-destructive)]"
          )}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </span>
          <button type="button" onClick={() => setError(null)} className="font-bold hover:opacity-80 shrink-0" aria-label="Dismiss">×</button>
        </div>
      )}

      {!loading && (
        <div>
          <input
            type="search"
            placeholder="Filter by name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={cn(inputBase, "max-w-sm")}
            aria-label="Filter products"
          />
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          "border-[var(--color-border)] bg-[var(--color-card)] shadow-sm"
        )}
      >
        <table className="w-full text-sm">
          <thead
            className={cn(
              "border-b border-[var(--color-border)]",
              "bg-[var(--color-muted)]/40"
            )}
          >
            <tr>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Product</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Vendor</th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Price</th>
              <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Stock</th>
              <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Status</th>
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Image</th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={"sk-" + i}>
                  <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-20 mx-auto" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-10 mx-auto" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                </tr>
              ))}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={
                      <div className="rounded-full bg-[var(--color-muted)] p-3">
                        <AlertTriangle className="h-6 w-6 text-[var(--color-muted-foreground)]" aria-hidden />
                      </div>
                    }
                    title="No inventory"
                    description="Add products to start managing your inventory."
                  />
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((p) => {
                const status = stockStatus(p);
                const draft = editing[p.id] ?? String(p.stockCount);
                return (
                  <tr key={p.id} className="hover:bg-[var(--color-muted)]/40">
                    <td className="p-3">
                      <span className="font-medium text-[var(--color-foreground)]">{p.name}</span>
                    </td>
                    <td className="p-3 text-xs text-[var(--color-muted-foreground)]">{p.vendorName}</td>
                    <td className="p-3 text-right tabular-nums text-[var(--color-foreground)]">${p.price.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      {editing[p.id] !== undefined ? (
                        <input
                          type="number"
                          min={0}
                          autoFocus
                          value={draft}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveStock(p.id);
                            if (e.key === "Escape")
                              setEditing((prev) => {
                                const c = { ...prev };
                                delete c[p.id];
                                return c;
                              });
                          }}
                          className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                          aria-label={"Stock for " + p.name}
                        />
                      ) : (
                        <span
                          className={cn(
                            "tabular-nums font-semibold",
                            status.cls
                          )}
                        >
                          {p.stockCount}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={status.label.toUpperCase().replace(" ", "_")} size="sm" />
                    </td>
                    <td className="p-3 text-center">
                      {(() => {
                        const imgs = Array.isArray(p.images) ? p.images.filter((i) => !!i) : [];
                        if (imgs.length === 0) return <span className="text-xs text-[var(--color-muted-foreground)]">No image</span>;
                        return (
                          <span className="inline-flex gap-1 items-center text-xs text-[var(--color-success)] font-medium">
                            <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden />
                            <span title={imgs[0]}>{imgs.length} verified</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {editing[p.id] !== undefined ? (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            disabled={savingId === p.id}
                            onClick={() => void saveStock(p.id)}
                            className={cn(
                              "rounded px-2.5 py-1 text-xs font-medium",
                              "bg-[var(--color-success)] text-[var(--color-success-foreground)]",
                              "hover:opacity-90 disabled:opacity-50"
                            )}
                          >
                            {savingId === p.id ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditing((prev) => {
                                const c = { ...prev };
                                delete c[p.id];
                                return c;
                              })
                            }
                            className="rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setEditing((prev) => ({ ...prev, [p.id]: String(p.stockCount) }))
                            }
                            className="text-xs font-medium text-[var(--color-info)] hover:underline"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === p.id}
                            onClick={() => void removeProduct(p)}
                            className="text-xs font-medium text-[var(--color-destructive)] hover:underline ml-2"
                            aria-label={"Deactivate " + p.name}
                          >
                            {deletingId === p.id ? "Deactivating..." : "Deactivate"}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="New product"
        >
          <form
            onSubmit={submitNew}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative z-[70] flex flex-col w-full max-w-md rounded-xl border shadow-xl",
              "border-[var(--color-border)] bg-[var(--color-card)] opacity-100",
              "p-6 space-y-5"
            )}
          >
            <div className="flex items-center justify-between rounded-lg bg-[var(--color-muted)]/60 border border-[var(--color-border)] px-4 py-3 shadow-sm">
              <h2 className="text-xl font-bold text-[var(--color-foreground)] tracking-tight">New Product</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm space-y-2">
              <label htmlFor="np-name" className="block text-sm font-bold text-[var(--color-foreground)]">Name</label>
              <input
                id="np-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={cn(inputBase, "w-full h-11 bg-white dark:bg-[var(--color-card)]")}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm space-y-2">
                <label htmlFor="np-price" className="block text-sm font-bold text-[var(--color-foreground)]">Price (USD)</label>
                <input
                  id="np-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className={cn(inputBase, "w-full h-11 bg-white dark:bg-[var(--color-card)]")}
                />
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm space-y-2">
                <label htmlFor="np-stock" className="block text-sm font-bold text-[var(--color-foreground)]">Stock</label>
                <input
                  id="np-stock"
                  type="number"
                  min={0}
                  value={form.stockCount}
                  onChange={(e) => setForm({ ...form, stockCount: Number(e.target.value) })}
                  className={cn(inputBase, "w-full h-11 bg-white dark:bg-[var(--color-card)]")}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)] mt-1">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={cn(
                  "rounded-lg px-5 py-2.5 text-sm font-medium",
                  "border border-[var(--color-border)] bg-[var(--color-muted)]/50",
                  "text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className={cn(
                  "rounded-lg px-5 py-2.5 text-sm font-bold shadow-sm",
                  "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
                  "hover:brightness-110 disabled:opacity-50"
                )}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <ToastProvider>
      <InventoryInner />
    </ToastProvider>
  );
}
