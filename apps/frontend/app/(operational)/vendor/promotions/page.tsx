"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Plus, Trash2, Power, RefreshCw, AlertTriangle } from "lucide-react";
import {
  getVendorPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "@/lib/api";
import type { PromotionDto, CreatePromotionDto, UpdatePromotionDto } from "@/lib/types";
import { useVendorId } from "@/lib/hooks/use-vendor-id";
import { useAuth } from "@/lib/auth-context";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface PromoForm {
  title: string;
  description: string;
  discountPercent: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

const emptyForm: PromoForm = {
  title: "",
  description: "",
  discountPercent: 10,
  isActive: true,
  startDate: "",
  endDate: "",
};

function PromoCard({
  promo,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggle,
  savingId,
  deletingId,
}: {
  promo: PromotionDto;
  editing: string | null;
  onEdit: (p: PromotionDto) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggle: () => void;
  savingId: string | null;
  deletingId: string | null;
}) {
  const isEditing = editing === promo.id;
  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
      {isEditing ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              value={promo.title}
              onChange={(e) => onEdit({ ...promo, title: e.target.value })}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              value={promo.discountPercent}
              onChange={(e) => onEdit({ ...promo, discountPercent: Number(e.target.value) })}
            />
          </div>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={promo.description ?? ""}
            onChange={(e) => onEdit({ ...promo, description: e.target.value || null })}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              type="date"
              value={promo.startDate ? promo.startDate.slice(0, 10) : ""}
              onChange={(e) => onEdit({ ...promo, startDate: e.target.value || null })}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              type="date"
              value={promo.endDate ? promo.endDate.slice(0, 10) : ""}
              onChange={(e) => onEdit({ ...promo, endDate: e.target.value || null })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promo.isActive}
                onChange={(e) => onEdit({ ...promo, isActive: e.target.checked })}
              /> Active
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              disabled={savingId === promo.id}
              onClick={onSave}
              className="rounded-lg bg-[var(--color-success)] px-3 py-2 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              {savingId === promo.id ? "Saving..." : "Save"}
            </button>
            <button onClick={onCancel} className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-[var(--color-muted)]">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-semibold text-[var(--color-foreground)] truncate">{promo.title}</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">{promo.discountPercent}% off</div>
            {promo.description && <div className="text-sm mt-1 text-[var(--color-muted-foreground)]">{promo.description}</div>}
            <div className="text-xs mt-1 text-[var(--color-muted-foreground)]">
              {promo.startDate ? promo.startDate.slice(0, 10) : "—"} →{" "}
              {promo.endDate ? promo.endDate.slice(0, 10) : "—"}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggle}
              title={promo.isActive ? "Deactivate" : "Activate"}
              className={cn("rounded p-2 hover:bg-[var(--color-hover)]", promo.isActive ? "text-green-600" : "text-gray-400")}
              aria-label={promo.isActive ? "Deactivate" : "Activate"}
            >
              <Power className="h-4 w-4" />
            </button>
            <button onClick={() => onEdit(promo)} className="rounded px-2 py-1 text-xs font-medium text-[var(--color-info)] hover:underline" aria-label="Edit">Edit</button>
            <button
              disabled={deletingId === promo.id}
              onClick={() => { if (window.confirm("Delete this promotion?")) onDelete(); }}
              className="rounded px-2 py-1 text-xs font-medium text-[var(--color-destructive)] hover:underline"
              aria-label="Delete"
            >
              {deletingId === promo.id ? "..." : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function PromotionsInner() {
  const { push: toast } = useToast();
  const { status: authStatus } = useAuth();
  const vendorId = useVendorId();
  const [promotions, setPromotions] = useState<PromotionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PromotionDto | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);

  const refresh = useCallback(async () => {
    // Do not issue API requests until AuthProvider has finished restoring
    // the browser session. vendorId can be temporarily null during restore.
    if (authStatus === "idle" || authStatus === "loading") {
      return;
    }

    if (authStatus !== "authenticated") {
      setPromotions([]);
      setLoading(false);
      setError("Your session has expired or you are not signed in. Please sign in again.");
      return;
    }

    if (!vendorId) {
      setPromotions([]);
      setLoading(false);
      setError("This authenticated account does not have a verified vendor identity.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getVendorPromotions();
      setPromotions(res.promotions || []);
    } catch (err) {
      const statusCode =
        typeof err === "object" && err !== null && "statusCode" in err
          ? Number((err as { statusCode?: unknown }).statusCode)
          : undefined;

      const msg =
        statusCode === 401
          ? "Your session is not authenticated or has expired. Please sign in again."
          : statusCode === 403
            ? "Your account is not authorized to manage vendor promotions."
            : err instanceof Error
              ? err.message
              : "Failed to load promotions";

      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [authStatus, vendorId, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!vendorId || !form.title.trim()) {
      toast("Title is required.", "error");
      return;
    }
    if (form.discountPercent < 0.01 || form.discountPercent > 100) {
      toast("Discount must be between 0.01% and 100%.", "error");
      return;
    }
    setCreating(true);
    try {
      const payload: CreatePromotionDto = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        discountPercent: form.discountPercent,
        isActive: form.isActive,
        startDate: form.startDate ? form.startDate + "T00:00:00Z" : null,
        endDate: form.endDate ? form.endDate + "T00:00:00Z" : null,
      };
      await createPromotion(payload);
      setForm(emptyForm);
      await refresh();
      toast("Promotion created.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create promotion";
      setError(msg);
      toast(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editing) return;
    if (editForm.discountPercent < 0.01 || editForm.discountPercent > 100) {
      toast("Discount must be between 0.01% and 100%.", "error");
      return;
    }
    setSavingId(editing);
    try {
      const payload: UpdatePromotionDto = {
        title: editForm.title.trim(),
        description: editForm.description || null,
        discountPercent: editForm.discountPercent,
        isActive: editForm.isActive,
        startDate: editForm.startDate ? editForm.startDate + "T00:00:00Z" : null,
        endDate: editForm.endDate ? editForm.endDate + "T00:00:00Z" : null,
      };
      await updatePromotion(editing, payload);
      setEditing(null);
      setEditForm(null);
      await refresh();
      toast("Promotion updated.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update promotion";
      toast(msg, "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deletePromotion(id);
      await refresh();
      toast("Promotion deleted.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete promotion";
      toast(msg, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setSavingId(id);
    try {
      await updatePromotion(id, { isActive: !current });
      await refresh();
      toast(current ? "Promotion deactivated." : "Promotion activated.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to toggle promotion";
      toast(msg, "error");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-[var(--color-brass)]" /> Promotions
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
            {loading ? "Loading..." : `${promotions.length} promotion${promotions.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          className="inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-accent)]"
          aria-label="Refresh promotions"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </button>
      </header>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded border p-3 text-sm border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 text-[var(--color-destructive)]">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" aria-hidden /> {error}</span>
          <button onClick={() => setError(null)} className="font-bold hover:opacity-80" aria-label="Dismiss">×</button>
        </div>
      )}

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 space-y-4">
        <h2 className="text-lg font-semibold">New Promotion</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label htmlFor="promo-title" className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Title *</label>
            <input
              id="promo-title"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="promo-discount" className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Discount % *</label>
            <input
              id="promo-discount"
              required
              min={0.01}
              max={100}
              step={0.01}
              type="number"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: Math.max(0.01, Number(e.target.value)) })}
            />
          </div>
          <div>
            <label htmlFor="promo-active" className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Status</label>
            <label className="flex items-center gap-2 text-sm h-10 rounded-lg border px-3 py-2 bg-[var(--color-background)] cursor-pointer">
              <input
                id="promo-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              /> Active
            </label>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="promo-desc" className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Description</label>
            <textarea
              id="promo-desc"
              rows={2}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="promo-start" className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">Start</label>
              <input
                id="promo-start"
                type="date"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="promo-end" className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-1">End</label>
              <input
                id="promo-end"
                type="date"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => setForm(emptyForm)}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            Reset
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !form.title.trim() || form.discountPercent < 0.01 || form.discountPercent > 100}
            className="rounded-lg bg-[var(--color-brass)] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Promotion"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2">
        <h2 className="text-lg font-semibold mb-3">Promotions</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={"sk-" + i} className="flex items-center gap-3 rounded-lg border p-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-6 w-6 text-[var(--color-muted-foreground)]" aria-hidden />}
            title="No promotions yet"
            description="Create your first promotion to start driving sales."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)] space-y-2">
            {promotions.map((p) => (
              <PromoCard
                key={p.id}
                promo={editForm && editing === p.id ? editForm : p}
                editing={editing}
                onEdit={(updated) => {
                  setEditForm(updated);
                  setEditing(p.id);
                }}
                onSave={handleSaveEdit}
                onCancel={() => { setEditing(null); setEditForm(null); }}
                onDelete={() => handleDelete(p.id)}
                onToggle={() => handleToggle(p.id, p.isActive)}
                savingId={savingId}
                deletingId={deletingId}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function PromotionsPage() {
  return (
    <ToastProvider>
      <PromotionsInner />
    </ToastProvider>
  );
}
