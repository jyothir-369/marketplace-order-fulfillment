"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Trash2, Power } from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discountPercent: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
}

export default function VendorPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", discountPercent: 10, isActive: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/promotions");
      const data = await res.json();
      setPromotions(data.promotions || []);
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ title: "", description: "", discountPercent: 10, isActive: true });
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/vendor/promotions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !active }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/vendor/promotions/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-[var(--color-brass)]" /> Promotions
      </h1>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 space-y-4">
        <h2 className="text-lg font-semibold">New Promotion</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
          <input placeholder="Discount %" type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" />
        <button onClick={handleCreate} disabled={saving || !form.title} className="rounded-lg bg-[var(--color-brass)] text-white px-4 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-50">
          {saving ? "Creating..." : "Create Promotion"}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2">
        <h2 className="text-lg font-semibold mb-3">Active Promotions</h2>
        {loading ? (
          <p className="text-sm text-[var(--color-warm-muted)]">Loading...</p>
        ) : promotions.length === 0 ? (
          <p className="text-sm text-[var(--color-warm-muted)]">No promotions yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {promotions.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-sm text-[var(--color-warm-muted)]">{p.discountPercent}% off</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(p.id, p.isActive)} title={p.isActive ? "Deactivate" : "Activate"} className="p-2 rounded hover:bg-[var(--color-hover)]">
                    <Power className={`h-4 w-4 ${p.isActive ? "text-green-600" : "text-gray-400"}`} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} title="Delete" className="p-2 rounded hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
