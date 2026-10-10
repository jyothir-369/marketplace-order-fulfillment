import { useState, useEffect } from "react";

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state?: string;
  zip?: string;
  country?: string;
  isDefault?: boolean;
}

export default function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "Home", street: "", city: "", state: "", zip: "", country: "India", isDefault: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/customer/addresses", {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText || "Load failed"))))
      .then((d) => setAddresses(d.addresses || []))
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ label: "Home", street: "", city: "", state: "", zip: "", country: "India", isDefault: false });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setSavedMsg(null); setError(null);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/customer/addresses/${editingId}` : "/api/customer/addresses";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      resetForm(); setSavedMsg(editingId ? "Updated." : "Created."); load();
    } catch (e: any) { setError(e.message || "Save failed"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    setDeletingId(id); setError(null);
    try {
      const res = await fetch(`/api/customer/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedMsg("Deleted."); load();
    } catch (e: any) { setError(e.message || "Delete failed"); }
    finally { setDeletingId(null); }
  };

  const startEdit = (a: Address) => {
    setForm({ label: a.label || "Home", street: a.street || "", city: a.city || "", state: a.state || "", zip: a.zip || "", country: a.country || "India", isDefault: !!a.isDefault });
    setEditingId(a.id);
  };

  if (loading) return <div>Loading addresses...</div>;
  return (
    <main>
      <h1>My Addresses</h1>
      {savedMsg && <div role="status" style={{ color: "green" }}>{savedMsg}</div>}
      {error && <div role="alert" style={{ color: "red" }}>{error}</div>}
      <form onSubmit={handleSubmit} aria-label="Address form">
        <label>Label <input required maxLength={50} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label>
        <label>Street <input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></label>
        <label>City <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
        <label>State <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label>
        <label>ZIP <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></label>
        <label>Country <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
        <label><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Default</label>
        <button type="submit" disabled={submitting}>{submitting ? (editingId ? "Saving..." : "Adding...") : (editingId ? "Save" : "Add address")}</button>
        {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
      </form>
      {addresses.length === 0 ? <p>No addresses saved.</p> : addresses.map((a: Address) => (
        <section key={a.id} aria-label={`Address ${a.label}`}>
          <h2>{a.label}</h2>
          <p>{a.street}, {a.city}</p>
          <p>{a.state ? `${a.state}, ` : ""}{a.zip || ""} {a.country}</p>
          <button onClick={() => startEdit(a)} aria-label={`Edit ${a.label}`}>Edit</button>
          <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} aria-label={`Delete ${a.label}`}>{deletingId === a.id ? "Deleting..." : "Delete"}</button>
        </section>
      ))}
    </main>
  );
}
