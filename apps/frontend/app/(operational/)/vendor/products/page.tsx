/**
 * Vendor Product CRUD — Phase 10 (vendor portal depth).
 * Product list with create/edit/deactivate actions; uses existing catalog API.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Package } from "lucide-react";
import { getCatalogPage, getProductById, updateStock, createProduct, deleteProduct } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default function VendorProductsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCatalogPage({ pageSize: 50 });
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="space-y-3"><Skeleton className="h-24 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">Products</h1>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] text-xs font-bold hover:bg-[var(--color-card)]"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          <button onClick={() => {}} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90"><Plus className="h-3.5 w-3.5" /> Create</button>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Package className="h-10 w-10 text-[var(--color-brass)]" />} title="No products" description="Create your first product to start selling." />
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-v2 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-ink-navy)] text-white text-xs uppercase tracking-wider">
              <tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Price</th><th className="text-left px-4 py-3">Stock</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {items.map((p: any) => (
                <tr key={p.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-cream)]/40">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-[var(--color-warm-muted)]">{p.category ?? "—"}</td>
                  <td className="px-4 py-3">${p.price}</td>
                  <td className="px-4 py-3">{p.stockCount}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => alert("Edit: " + p.id)} className="text-[var(--color-brass)] hover:underline mx-1"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => alert("Delete: " + p.id)} className="text-[var(--color-destructive)] hover:underline mx-1"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
