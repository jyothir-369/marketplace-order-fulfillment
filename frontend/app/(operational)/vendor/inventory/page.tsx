"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X, AlertTriangle } from "lucide-react";
import {
  Product,
  VENDOR_ID,
  getVendorProducts,
  updateStock,
  createProduct,
} from "@/lib/api";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface NewProductForm {
  name: string;
  price: number;
  stockCount: number;
}

const emptyForm: NewProductForm = { name: "", price: 0, stockCount: 0 };

function InventoryInner() {
  const { push: toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NewProductForm>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVendorProducts(VENDOR_ID, true);
      setProducts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load inventory";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

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
    setSavingId(productId);
    try {
      const updated = await updateStock(productId, { stockCount: next });
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      setEditing((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      toast("Stock updated for " + updated.name, "success");
    } catch (err) {
      const statusCode = err && typeof err === "object" && "statusCode" in err ? (err as {statusCode:number}).statusCode : 0;
      // 409 Conflict: optimistic-lock / version mismatch
      if (statusCode === 409) {
        // Revert local edit
        setEditing((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
        // Auto-refetch server state
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

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Name is required.", "error");
      return;
    }
    if (form.price < 0 || form.stockCount < 0) {
      toast("Price and stock must be non-negative.", "error");
      return;
    }
    setCreating(true);
    try {
      const created = await createProduct({
        vendorId: VENDOR_ID,
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

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Inventory</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? "Loading..." : products.length + " product" + (products.length !== 1 ? "s" : "") + " · " + nonZeroStock + " in stock · " + outOfStock + " out of stock"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void refresh()} className="px-3 py-2 text-sm border border-zinc-300 rounded hover:bg-zinc-50">Refresh</button>
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded font-medium hover:bg-indigo-700">
            <Plus className="h-4 w-4" aria-hidden /> New Product
          </button>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <input type="search" placeholder="Filter by name..." value={filter} onChange={e => setFilter(e.target.value)} className="border border-zinc-300 rounded px-3 py-1.5 text-sm w-64" />
        <span className="text-xs text-zinc-500">{filtered.length} matching</span>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 text-left font-semibold text-zinc-700 text-xs uppercase tracking-wide">ID</th>
              <th className="p-3 text-left font-semibold text-zinc-700 text-xs uppercase tracking-wide">Product</th>
              <th className="p-3 text-right font-semibold text-zinc-700 text-xs uppercase tracking-wide w-24">Price</th>
              <th className="p-3 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide w-24">Stock</th>
              <th className="p-3 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide w-24">Status</th>
              <th className="p-3 text-right font-semibold text-zinc-700 text-xs uppercase tracking-wide w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={"sk-" + i}>
                <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                <td className="p-3"><Skeleton className="h-4 w-40" /></td>
                <td className="p-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                <td className="p-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                <td className="p-3"><Skeleton className="h-4 w-16 mx-auto" /></td>
                <td className="p-3"><Skeleton className="h-6 w-20 ml-auto" /></td>
              </tr>
            ))}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title="No products yet"
                    description="Add your first product to get started."
                    action={<button type="button" onClick={() => setModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700">New Product</button>}
                  />
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && products.length > 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-sm text-zinc-500">No products match "{filter}".</td></tr>
            )}

            {!loading && filtered.map((p) => {
              const draft = editing[p.id];
              const isEditing = draft !== undefined;
              const stockStatus = p.stockCount === 0 ? { label: "Out", cls: "bg-red-100 text-red-700" } : p.stockCount <= 10 ? { label: "Low", cls: "bg-amber-100 text-amber-700" } : { label: "OK", cls: "bg-emerald-100 text-emerald-700" };
              return (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="p-3 font-mono text-xs text-zinc-500">{p.id.slice(0, 8)}</td>
                  <td className="p-3">
                    <div className="font-medium text-zinc-900">{p.name}</div>
                    <div className="text-xs text-zinc-500">{p.vendorName}</div>
                  </td>
                  <td className="p-3 text-right"></td>
                  <td className="p-3 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        autoFocus
                        value={draft}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveStock(p.id);
                          if (e.key === "Escape") setEditing((prev) => { const c = { ...prev }; delete c[p.id]; return c; });
                        }}
                        className="w-20 border border-zinc-300 rounded px-2 py-1 text-sm text-center"
                        aria-label={"Stock for " + p.name}
                      />
                    ) : (
                      <span className={p.stockCount === 0 ? "text-red-600 font-semibold" : ""}>{p.stockCount}</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={["inline-block px-2 py-0.5 rounded text-xs font-semibold", stockStatus.cls].join(" ")}>{stockStatus.label}</span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <button type="button" disabled={savingId === p.id} onClick={() => void saveStock(p.id)} className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">{savingId === p.id ? "Saving..." : "Save"}</button>
                        <button type="button" onClick={() => setEditing((prev) => { const c = { ...prev }; delete c[p.id]; return c; })} className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700">Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setEditing((prev) => ({ ...prev, [p.id]: String(p.stockCount) }))} className="text-indigo-600 text-xs hover:underline font-medium">Adjust</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setModalOpen(false)}>
          <form onSubmit={submitNew} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">New Product</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-700" aria-label="Close"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <div>
              <label htmlFor="np-name" className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
              <input id="np-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-zinc-300 rounded px-3 py-2 text-sm" required />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="np-price" className="block text-sm font-medium text-zinc-700 mb-1">Price (USD)</label>
                <input id="np-price" type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full border border-zinc-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="flex-1">
                <label htmlFor="np-stock" className="block text-sm font-medium text-zinc-700 mb-1">Stock</label>
                <input id="np-stock" type="number" min={0} value={form.stockCount} onChange={(e) => setForm({ ...form, stockCount: Number(e.target.value) })} className="w-full border border-zinc-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-zinc-700">Cancel</button>
              <button type="submit" disabled={creating} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{creating ? "Creating..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return <ToastProvider><InventoryInner /></ToastProvider>;
}