'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Uuid, type ApiErrorBody } from "@/lib/types";
import { MapPin, Edit, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
interface AddressDto {
  id: Uuid; label: string; street: string; city: string; state: string | null; zip: string | null; country: string; isDefault: boolean; createdAt: string;
}

export default function Page() {
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<Uuid | null>(null);
  const [fields, setFields] = useState({ label: "Home", street: "", city: "", state: "", zip: "", country: "India", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiFetch<{ addresses: AddressDto[] }>("/customer/addresses");
      setAddresses(data.addresses ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load addresses");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setEditId(null); setFields({ label: "Home", street: "", city: "", state: "", zip: "", country: "India", isDefault: false }); setFormOpen(false); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const body = { label: fields.label, street: fields.street, city: fields.city, state: fields.state || undefined, zip: fields.zip || undefined, country: fields.country, isDefault: !!fields.isDefault };
      if (editId) await apiFetch<AddressDto>(`/customer/addresses/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      else await apiFetch<{ address: AddressDto }>("/customer/addresses", { method: "POST", body: JSON.stringify(body) });
      resetForm(); await load();
    } catch (e: any) { setError(`${e?.statusCode ? `HTTP ${e.statusCode}` : "Failed"}: ${e?.message || "Save failed"}`); }
    finally { setSaving(false); }
  };

  const remove = async (id: Uuid) => { if (!window.confirm("Delete this address?")) return; try { await apiFetch(`/customer/addresses/${id}`, { method: "DELETE" }); await load(); } catch (e: any) { alert(`HTTP ${e?.statusCode ?? "error"}: ${e?.message}`); } };
  const setDefault = async (id: Uuid) => { try { await apiFetch(`/customer/addresses/${id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) }); await load(); } catch (e: any) { alert(`HTTP ${e?.statusCode ?? "error"}: ${e?.message}`); } };

  return (
    <main style={{background:"#faf7f1",fontFamily:"Inter,system-ui,sans-serif",color:"#1b1b18"}} className="max-w-4xl mx-auto px-6 py-10 min-h-full">
      <div className="mb-6 flex gap-3 text-sm text-[var(--color-warm-muted)]">
        <Link href="/" className="text-[var(--color-ink-navy)] hover:underline font-semibold">Storefront</Link>
        <span className="text-[var(--color-border)]">/</span>
        <Link href="/account" className="text-[var(--color-ink-navy)] hover:underline font-semibold">Account</Link>
        <span className="text-[var(--color-border)]">/</span>
        <span className="font-medium text-[var(--color-ink-navy)]">Addresses</span>
      </div>
      <h1 className="font-display text-3xl font-bold text-[var(--color-ink-navy)] mb-2">My Addresses</h1>
      <p className="text-sm text-[var(--color-warm-muted)] mb-6">Saved shipping and billing addresses for your account.</p>
              <div className="flex items-center gap-3 mt-4 mb-2">
                <label htmlFor="role-dropdown" className="text-xs font-semibold text-[var(--color-warm-muted)]">Portal:</label>
                <select id="role-dropdown" value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-1.5 text-sm text-[var(--color-ink-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]">
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="admin">Admin</option>
                </select>
                <span className="text-xs text-[var(--color-warm-muted)]">Role-aware address view</span>
              </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2">
        {loading ? (<div className="animate-pulse h-16 w-full bg-[var(--color-card)] rounded" />) : error ? (
          <div className="rounded-xl border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-v2 flex flex-wrap items-center gap-3">
            <span className="font-semibold">Failed to load addresses</span><span>{error}</span>
            <button onClick={() => load()} className="ml-auto px-3 py-1.5 rounded-md bg-[var(--color-ink-navy)] text-white text-xs font-bold hover:brightness-110">Retry</button>
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-warm-muted)]">
            <MapPin className="h-8 w-8 mx-auto mb-3 text-[var(--color-ink-navy)] opacity-50" /><p className="font-medium text-base">No addresses saved.</p><p className="text-xs mt-1">Add your first address below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map(a => (
              <div key={a.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] p-4 flex items-start justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="inline-flex h-6 w-6 rounded-full bg-[var(--color-ink-navy)] text-white text-xs font-bold items-center justify-center">{a.label[0]}</span><span className="font-medium text-sm truncate">{a.street}</span>{a.isDefault && <span className="text-[var(--color-primary)] text-xs font-semibold">Default</span>}</div>
                  <p className="text-xs text-[var(--color-warm-muted)] mt-1">{a.city}{a.state ? `, ${a.state}` : ""}{a.zip ? ` ${a.zip}` : ""} · {a.country}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditId(a.id); setFields({ label: a.label, street: a.street, city: a.city, state: a.state ?? "", zip: a.zip ?? "", country: a.country, isDefault: a.isDefault }); setFormOpen(true); }} className="inline-flex items-center gap-1 rounded-md bg-[var(--color-ink-navy)] text-white text-xs font-semibold px-2 py-1 hover:brightness-110" aria-label="Edit"><Edit className="h-3.5 w-3.5" /> Edit</button>
                  {!a.isDefault && <button onClick={() => setDefault(a.id)} className="text-[var(--color-primary)] hover:underline text-xs px-1">Set default</button>}
                  <button onClick={() => remove(a.id)} className="text-red-500 hover:text-red-700 text-xs px-1" aria-label="Delete"><Trash2 className="inline h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 mt-2"><button onClick={() => { resetForm(); setFormOpen(!formOpen); }} className="flex items-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-lg border border-[var(--color-ink-navy)] text-[var(--color-ink-navy)] text-sm font-semibold hover:bg-[var(--color-cream)] transition"><Plus className="h-4 w-4" />{formOpen ? "Cancel" : "New address"}</button></div>
        {formOpen && (
          <form onSubmit={save} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 mt-4 space-y-4 shadow-v2">
            <h3 className="font-display text-lg font-bold text-[var(--color-ink-navy)]">{editId ? "Edit" : "New"} Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label htmlFor="a-label" className="block text-xs font-semibold text-[var(--color-warm-muted)] mb-1">Label</label><input id="a-label" value={fields.label} onChange={e => setFields(f => ({ ...f, label: e.target.value }))} required className={cn("w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]", error && "border-red-400")} /></div>
              <div><label htmlFor="a-street" className="block text-xs font-semibold text-[var(--color-warm-muted)] mb-1">Street / Address</label><input id="a-street" value={fields.street} onChange={e => setFields(f => ({ ...f, street: e.target.value }))} required className={cn("w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]", error && "border-red-400")} /></div>
              <div><label htmlFor="a-city" className="block text-xs font-semibold text-[var(--color-warm-muted)] mb-1">City</label><input id="a-city" value={fields.city} onChange={e => setFields(f => ({ ...f, city: e.target.value }))} required className={cn("w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]", error && "border-red-400")} /></div>
              <div><label htmlFor="a-state" className="block text-xs font-semibold text-[var(--color-warm-muted)] mb-1">State</label><input id="a-state" value={fields.state} onChange={e => setFields(f => ({ ...f, state: e.target.value }))} className={cn("w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]", error && "border-red-400")} /></div>
              <div><label htmlFor="a-zip" className="block text-xs font-semibold text-[var(--color-warm-muted)] mb-1">ZIP / Postal code</label><input id="a-zip" value={fields.zip} onChange={e => setFields(f => ({ ...f, zip: e.target.value }))} className={cn("w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]", error && "border-red-400")} /></div>
              <div><label htmlFor="a-country" className="block text-xs font-semibold text-[var(--color-warm-muted)] mb-1">Country</label><input id="a-country" value={fields.country} onChange={e => setFields(f => ({ ...f, country: e.target.value }))} required className={cn("w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm bg-[var(--color-cream)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]", error && "border-red-400")} /></div>
            </div>
            <label htmlFor="a-default" className="flex items-center gap-2 text-sm text-[var(--color-foreground)] cursor-pointer select-none"><input id="a-default" type="checkbox" checked={!!fields.isDefault} onChange={e => setFields(f => ({ ...f, isDefault: e.target.checked }))} className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-ink-navy)] focus:ring-[var(--color-brass)]" /> Set as default address</label>
            <div className="flex gap-3 pt-1"><button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-[var(--color-ink-navy)] text-white text-sm font-bold shadow hover:brightness-110 disabled:opacity-50">Save Address</button><button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-lg border border-[var(--color-ink-navy)] text-[var(--color-ink-navy)] text-sm font-semibold hover:bg-[var(--color-cream)] transition">Cancel</button></div>
            {error && <div className="text-sm text-red-600 font-medium">{error} <button onClick={() => load()} className="ml-2 underline text-xs">Retry</button></div>}
          </form>
        )}
      </div>
    </main>
  );
}

