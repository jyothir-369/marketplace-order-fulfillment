/*
 * app/(operational)/admin/categories/page.tsx - Category Management (Section 6).
 */

"use client";

import { FormEvent, useEffect, useState } from "react"
import { FolderTree, Plus, RefreshCw, X } from "lucide-react"
import { getAdminCategories, createCategory } from "@/lib/api"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { CategorySummaryDto } from "@/lib/types"

function AdminCategoriesInner() {
  const { push: toast } = useToast()
  const [categories, setCategories] = useState<CategorySummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminCategories()
      setCategories(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load categories"
      setError(msg)
      toast(msg, "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newName.trim()) { toast("Category name is required.", "error"); return }
    setCreating(true)
    try {
      const created = await createCategory({ name: newName.trim() })
      setCategories((prev) => {
        const exists = prev.find((c) => c.name === created.name)
        if (exists) return prev.map((c) => c.name === created.name ? created : c)
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      })
      setNewName("")
      setModalOpen(false)
      toast("Category registered: " + created.name, "success")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create category"
      toast(msg, "error")
    } finally {
      setCreating(false)
    }
  }

  const totalProducts = categories.reduce((s, c) => s + c.productCount, 0)
  const totalActive = categories.reduce((s, c) => s + c.activeProductCount, 0)
  const totalStock = categories.reduce((s, c) => s + c.totalStock, 0)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {loading
              ? "Loading..."
              : categories.length + " categor" + (categories.length !== 1 ? "ies" : "y") + " " + "·" + " " + totalProducts + " total products " + " " + "·" + " " + totalActive + " active " + " " + "·" + " " + totalStock.toLocaleString() + " units in stock"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void load()} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm","border border-[var(--color-border)] bg-[var(--color-card)]","text-[var(--color-foreground)] hover:bg-[var(--color-accent)]")}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium","bg-[var(--color-primary)] text-[var(--color-primary-foreground)]","hover:opacity-90")}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            New Category
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-4 text-sm font-medium">{error}</div>
      )}

      <div className={cn("rounded-xl border bg-[var(--color-card)] shadow-sm","border-[var(--color-border)]")}>
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <FolderTree className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Category Inventory</h2>
          <span className="ml-auto rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">{categories.length}</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="2.5rem" className="rounded" />)}</div>
        ) : categories.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-[var(--color-muted-foreground)]">
            <FolderTree className="h-6 w-6" aria-hidden />
            <p className="text-sm">No categories yet. Seed the catalog first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-muted)]/40 text-left text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  <th className="px-4 py-2.5 font-medium">Category Name</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total Products</th>
                  <th className="px-4 py-2.5 font-medium text-right">Active Products</th>
                  <th className="px-4 py-2.5 font-medium text-right">Inactive</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total Stock</th>
                  <th className="px-4 py-2.5 font-medium text-center">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {categories.map((cat) => {
                  const inactive = cat.productCount - cat.activeProductCount
                  const health = inactive === cat.productCount
                    ? { label: "Inactive", cls: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]" }
                    : cat.totalStock === 0
                      ? { label: "No stock", cls: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]" }
                      : { label: "Active", cls: "bg-[var(--color-success)]/10 text-[var(--color-success)]" }
                  return (
                    <tr key={cat.name} className="hover:bg-[var(--color-muted)]/40">
                      <td className="px-4 py-2.5 font-medium text-[var(--color-foreground)]">{cat.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-foreground)]">{cat.productCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-success)]">{cat.activeProductCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-muted-foreground)]">{inactive}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-foreground)]">{cat.totalStock.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center"><span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", health.cls)}>{health.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/40">
                  <td className="px-4 py-2.5 font-semibold text-[var(--color-foreground)]">Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-foreground)]">{totalProducts}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-success)]">{totalActive}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-muted-foreground)]">{totalProducts - totalActive}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-foreground)]">{totalStock.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true" aria-label="New category">
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className={cn("w-full max-w-sm rounded-xl border p-6 shadow-xl","border-[var(--color-border)] bg-[var(--color-card)]","space-y-4")}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Category</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]" aria-label="Close"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">Categories are stored on products. Assign this name when creating or editing a product.</p>
            <div>
              <label htmlFor="cat-name" className="mb-1 block text-sm font-medium">Category Name</label>
              <input id="cat-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Home & Living" className={cn("w-full rounded border px-3 py-2 text-sm","border-[var(--color-border)] bg-[var(--color-background)]","text-[var(--color-foreground)]","focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]")} required minLength={2} autoFocus />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className={cn("rounded px-4 py-2 text-sm","border border-[var(--color-border)] bg-[var(--color-card)]","text-[var(--color-foreground)] hover:bg-[var(--color-accent)]")}>Cancel</button>
              <button type="submit" disabled={creating || !newName.trim()} className={cn("rounded px-4 py-2 text-sm font-medium","bg-[var(--color-primary)] text-[var(--color-primary-foreground)]","hover:opacity-90 disabled:opacity-50")}>{creating ? "Creating..." : "Create Category"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function AdminCategoriesPage() {
  return (
    <ToastProvider>
      <AdminCategoriesInner />
    </ToastProvider>
  )
}