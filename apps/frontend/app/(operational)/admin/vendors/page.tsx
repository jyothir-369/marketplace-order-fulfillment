/*
 * app/(operational)/admin/vendors/page.tsx - Vendor Onboarding & Directory (Section 6).
 */

"use client";

import { FormEvent, useEffect, useState } from "react"
import { Building2, Plus, RefreshCw, X } from "lucide-react"
import { getAdminVendors, createVendor } from "@/lib/api"
import { ToastProvider, useToast } from "@/components/ui/toast"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { VendorDetailDto } from "@/lib/types"

function AdminVendorsInner() {
  const { push: toast } = useToast()
  const [vendors, setVendors] = useState<VendorDetailDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminVendors()
      setVendors(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load vendors"
      setError(msg)
      toast(msg, "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newName.trim()) { toast("Vendor name is required.", "error"); return }
    setCreating(true)
    try {
      const created = await createVendor({ name: newName.trim() })
      setVendors((prev) => [created, ...prev])
      setNewName("")
      setModalOpen(false)
      toast("Vendor onboarded: " + created.name, "success")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to onboard vendor"
      toast(msg, "error")
    } finally {
      setCreating(false)
    }
  }

  const totalProducts = vendors.reduce((s, v) => s + v.productCount, 0)
  const totalStock = vendors.reduce((s, v) => s + v.totalStock, 0)
  const totalOut = vendors.reduce((s, v) => s + v.outOfStockCount, 0)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {loading
              ? "Loading..."
              : vendors.length + " vendor" + (vendors.length !== 1 ? "s" : "") + " " + "·" + " " + totalProducts + " products " + " " + "·" + " " + totalStock.toLocaleString() + " units in stock " + " " + "·" + " " + totalOut + " out-of-stock"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void load()} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm","border border-[var(--color-border)] bg-[var(--color-card)]","text-[var(--color-foreground)] hover:bg-[var(--color-accent)]")}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium","bg-[var(--color-primary)] text-[var(--color-primary-foreground)]","hover:opacity-90")}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Onboard Vendor
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] p-4 text-sm font-medium">{error}</div>
      )}

      <div className={cn("rounded-xl border bg-[var(--color-card)] shadow-sm","border-[var(--color-border)]")}>
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Vendor Directory (Admin)</h2>
          <span className="ml-auto rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted-foreground)]">{vendors.length}</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="2.5rem" className="rounded" />)}</div>
        ) : vendors.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-[var(--color-muted-foreground)]">
            <Building2 className="h-6 w-6" aria-hidden />
            <p className="text-sm">No vendors yet. Onboard one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-muted)]/40 text-left text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  <th className="px-4 py-2.5 font-medium">Vendor</th>
                  <th className="px-4 py-2.5 font-medium">ID</th>
                  <th className="px-4 py-2.5 font-medium text-right">Products</th>
                  <th className="px-4 py-2.5 font-medium text-right">Active</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total Stock</th>
                  <th className="px-4 py-2.5 font-medium text-right">Low</th>
                  <th className="px-4 py-2.5 font-medium text-right">Out</th>
                  <th className="px-4 py-2.5 font-medium text-center">Status</th>
                  <th className="px-4 py-2.5 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {vendors.map((v) => {
                  const isEmpty = v.productCount === 0
                  const status = isEmpty
                    ? { label: "Empty", cls: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]" }
                    : v.outOfStockCount > 0
                      ? { label: "Critical", cls: "bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]" }
                      : v.lowStockCount > 0
                        ? { label: "Attention", cls: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]" }
                        : { label: "Healthy", cls: "bg-[var(--color-success)]/10 text-[var(--color-success)]" }
                  return (
                    <tr key={v.id} className="hover:bg-[var(--color-muted)]/40">
                      <td className="px-4 py-2.5 font-medium text-[var(--color-foreground)]">{v.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-muted-foreground)]">{v.id.slice(0, 8)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-foreground)]">{v.productCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-success)]">{v.activeProductCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-foreground)]">{v.totalStock.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-warning)]">{v.lowStockCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-destructive)]">{v.outOfStockCount}</td>
                      <td className="px-4 py-2.5 text-center"><span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", status.cls)}>{status.label}</span></td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-muted-foreground)] whitespace-nowrap">{new Date(v.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--color-border)] bg-[var(--color-muted)]/40">
                  <td className="px-4 py-2.5 font-semibold text-[var(--color-foreground)]">Total</td>
                  <td />
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-foreground)]">{totalProducts}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-success)]">{vendors.reduce((s, v) => s + v.activeProductCount, 0)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-foreground)]">{totalStock.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-warning)]">{vendors.reduce((s, v) => s + v.lowStockCount, 0)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--color-destructive)]">{totalOut}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true" aria-label="Onboard vendor">
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className={cn("w-full max-w-sm rounded-xl border p-6 shadow-xl","border-[var(--color-border)] bg-[var(--color-card)]","space-y-4")}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Onboard Vendor</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]" aria-label="Close"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)]">Vendor names are case-insensitive unique. Once onboarded, products can be assigned to this vendor.</p>
            <div>
              <label htmlFor="vendor-name" className="mb-1 block text-sm font-medium">Vendor Name</label>
              <input id="vendor-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Acme Supplies" className={cn("w-full rounded border px-3 py-2 text-sm","border-[var(--color-border)] bg-[var(--color-background)]","text-[var(--color-foreground)]","focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]")} required minLength={2} autoFocus />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className={cn("rounded px-4 py-2 text-sm","border border-[var(--color-border)] bg-[var(--color-card)]","text-[var(--color-foreground)] hover:bg-[var(--color-accent)]")}>Cancel</button>
              <button type="submit" disabled={creating || !newName.trim()} className={cn("rounded px-4 py-2 text-sm font-medium","bg-[var(--color-primary)] text-[var(--color-primary-foreground)]","hover:opacity-90 disabled:opacity-50")}>{creating ? "Creating..." : "Onboard"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function AdminVendorsPage() {
  return (
    <ToastProvider>
      <AdminVendorsInner />
    </ToastProvider>
  )
}