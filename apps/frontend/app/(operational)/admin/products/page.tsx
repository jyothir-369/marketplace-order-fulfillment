/**
 * Admin products table — Phase 11.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Package, RefreshCw } from "lucide-react";
import { getCatalogPage } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProductsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const r = await getCatalogPage({ includeInactive: true, pageSize: 50 }); setItems(r.items); } catch { setItems([]); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  return (
    <div className="space-y-4"><h1 className="font-display text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-[var(--color-brass)]" /> Products</h1><button onClick={load} className="text-xs font-bold border px-2 py-1 rounded"><RefreshCw className="h-3 w-3 inline" /> Refresh</button><div className="rounded-2xl border bg-[var(--color-card)] shadow-v2 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[var(--color-ink-navy)] text-white"><tr><th className="text-left px-3 py-2">ID</th><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Category</th><th className="text-left px-3 py-2">Price</th><th className="text-left px-3 py-2">Status</th></tr></thead><tbody>{items.map((p) => <tr key={p.id} className="border-t border-[var(--color-border)]"><td className="px-3 py-2 font-mono text-xs">{p.id.slice(0, 8)}…</td><td className="px-3 py-2">{p.name}</td><td className="px-3 py-2">{p.category ?? "—"}</td><td className="px-3 py-2">${p.price}</td><td className="px-3 py-2">{p.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div></div>
  );
}
