"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Shield, Bell, MapPin, Package, Clock, LogOut, ChevronRight, AlertCircle, Check, X, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { UserDto, Uuid, type ApiErrorBody } from "@/lib/types";
import { useCartStore } from "@/context/CartStore";
import { cn } from "@/lib/utils";

interface AddressDto {
  id: Uuid;
  label: string;
  street: string;
  city: string;
  state: string | null;
  zip: string | null;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

export default function AccountPage() {
  const { user, status, logout } = useAuth();
  const [tab, setTab] = useState<"profile" | "orders" | "addresses" | "notifications" | "security">("profile");
  const addToCart = useCartStore((s: any) => s.addToCart);
  const loadingProfile = !user || status !== "authenticated";
  const [profile, setProfile] = useState<UserDto | null>(null);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [addressLoading, setAddressLoading] = useState(true);

  // Profile editing state
  const [profileEditing, setProfileEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Address form
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editAddressId, setEditAddressId] = useState<Uuid | null>(null);
  const [addrFields, setAddrFields] = useState({
    label: "", street: "", city: "", state: "", zip: "", country: "", isDefault: false,
  });
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressSaving, setAddressSaving] = useState(false);

  const roleIsReadonly = user?.role === "admin" || user?.role === "operations";

  // Load real profile + addresses on mount and when tab changes
  useEffect(() => {
    if (!user || status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const [profileData, addrData] = await Promise.all([
          tab === "profile" ? apiFetch<UserDto>("/customer/profile") : Promise.resolve(null),
          apiFetch<{ addresses: AddressDto[] }>("/customer/addresses"),
        ]);
        if (cancelled) return;
        if (profileData) {
          setProfile(profileData);
          setDisplayName(profileData.displayName ?? "");
          setBio(profileData.bio ?? "");
        }
        setAddresses(addrData.addresses ?? []);
        setAddressesLoading(false);
      } catch (e) { /* status error toast handled by auth layer */ }
    })();
    return () => { cancelled = true; };
  }, [user, status, tab]);

  async function loadAddresses() {
    setAddressesLoading(true);
    try {
      const data = await apiFetch<{ addresses: AddressDto[] }>("/customer/addresses");
      setAddresses(data.addresses ?? []);
    } catch (e) {
      setAddressError("Failed to load addresses");
    } finally {
      setAddressesLoading(false);
    }
  }

  function startNewAddress() {
    setEditAddressId(null);
    setAddrFields({ label: "", street: "", city: "", state: "", zip: "", country: "", isDefault: false });
    setAddressError(null);
    setAddressFormOpen(true);
  }

  function startEditAddress(a: AddressDto) {
    setEditAddressId(a.id);
    setAddrFields({ label: a.label, street: a.street, city: a.city, state: a.state ?? "", zip: a.zip ?? "", country: a.country, isDefault: a.isDefault });
    setAddressError(null);
    setAddressFormOpen(true);
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddressSaving(true);
    setAddressError(null);
    try {
      const body = {
        label: addrFields.label,
        street: addrFields.street,
        city: addrFields.city,
        state: addrFields.state || undefined,
        zip: addrFields.zip || undefined,
        country: addrFields.country,
        isDefault: !!addrFields.isDefault,
      };
      let res;
      if (editAddressId) {
        res = await apiFetch<AddressDto>(`/customer/addresses/${editAddressId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        res = await apiFetch<{ address: AddressDto }>("/customer/addresses", { method: "POST", body: JSON.stringify(body) });
      }
      setAddressFormOpen(false);
      await loadAddresses();
    } catch (err) {
      const e2 = err as Error & { statusCode?: number; body?: ApiErrorBody };
      setAddressError(`${e2.statusCode ? `HTTP ${e2.statusCode}` : "Failed to save"}: ${e2.message}`);
    } finally {
      setAddressSaving(false);
    }
  }

  async function deleteAddress(a: AddressDto) {
    if (!window.confirm(`Delete this address?`)) return;
    try {
      await apiFetch(`/customer/addresses/${a.id}`, { method: "DELETE" });
      await loadAddresses();
    } catch (err) {
      const e2 = err as Error & { statusCode?: number };
      alert(`HTTP ${e2.statusCode ?? "error"}: ${e2.message}`);
    }
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setProfileError(null);
    try {
      await apiFetch<UserDto>("/customer/profile", { method: "PATCH", body: JSON.stringify({ displayName, bio }) });
      setProfileEditing(false);
      const fresh = await apiFetch<UserDto>("/customer/profile");
      setProfile(fresh);
      localStorage.setItem("user", JSON.stringify(fresh));
    } catch (err) {
      const e2 = err as Error & { statusCode?: number; body?: ApiErrorBody };
      setProfileError(`${e2.statusCode ? `HTTP ${e2.statusCode}` : "Failed to save"}: ${e2.message}`);
    } finally {
      setSavingProfile(false);
    }
  }

  function cancelProfileEdit() {
    setProfileEditing(false);
    setProfileError(null);
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setBio(profile.bio ?? "");
    }
  }

  const currentTab = user && !loadingProfile ? (tab === "profile" ? profile ?? user : tab) : (user ?? null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex gap-3 mb-4 text-sm">
        <Link href="/" className="text-[var(--color-primary)] hover:underline font-medium">Storefront</Link>
        <span className="text-[var(--color-border)]">|</span>
        <Link href="/dashboard" className="text-[var(--color-primary)] hover:underline font-medium">Dashboard</Link>
      </div>
      <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)] mb-2">Account</h1>

      <nav className="flex gap-2 mb-8 overflow-x-auto" aria-label="Account tabs">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "orders", label: "Orders", icon: Package },
          { id: "addresses", label: "Addresses", icon: MapPin },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "security", label: "Security", icon: Shield },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition", tab === t.id ? "bg-[var(--color-ink-navy)] text-white border-[var(--color-ink-navy)]" : "bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-brass)]")} aria-pressed={tab === t.id}>
            <t.icon className="h-4 w-4" aria-hidden /> {t.label}
          </button>
        ))}
      </nav>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 min-h-[300px]">
        {loadingProfile && !profile ? (
          <>
            <div className="animate-pulse h-8 w-48 bg-[var(--color-card)] rounded mb-6" />
            <div className="h-64 bg-[var(--color-card)] rounded-2xl" />
          </>
        ) : tab === "profile" ? (
          <div className="space-y-4">
            {!profileEditing ? (
              <>
                <h2 className="font-display text-xl font-bold">Profile</h2>
                <p className="text-sm text-[var(--color-warm-muted)]">Manage your name and bio.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm"><span className="text-[var(--color-warm-muted)]">Display name</span><p className="font-medium">{profile?.displayName ?? "—"}</p></div>
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm"><span className="text-[var(--color-warm-muted)]">Email</span><p className="font-medium">{profile?.email ?? "—"}</p></div>
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm"><span className="text-[var(--color-warm-muted)]">Role</span><p className="font-medium capitalize">{profile?.role ?? "customer"}</p></div>
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm"><span className="text-[var(--color-warm-muted)]">Bio</span><p className="font-medium">{profile?.bio ?? "—"}</p></div>
                </div>
                <div className="mt-6 flex gap-3">
                  {!roleIsReadonly && <button onClick={() => { setDisplayName(profile?.displayName ?? ""); setBio(profile?.bio ?? ""); setProfileEditing(true); }} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold">Edit</button>}
                  {roleIsReadonly && <span className="self-center text-xs text-[var(--color-ink-navy)] font-medium">View-only — admin access</span>}
                </div>
              </>
            ) : (
              <form onSubmit={submitProfile} className="space-y-4 max-w-md">
                <h2 className="font-display text-xl font-bold">Edit Profile</h2>
                <p className="text-sm text-[var(--color-warm-muted)]">Your role and credentials cannot be changed.</p>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-warm-muted)] mb-1">Display name</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={1} maxLength={50} disabled={roleIsReadonly}
                    className={cn("w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:ring-[var(--color-primary)] focus:outline-none disabled:opacity-70", profileError && "border-red-400")} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-warm-muted)] mb-1">Bio (optional)</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={280} disabled={roleIsReadonly}
                    className={cn("w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:ring-[var(--color-primary)] focus:outline-none disabled:opacity-70", profileError && "border-red-400")} />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={savingProfile || roleIsReadonly} className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-70">Save</button>
                  {profileError && <span className="self-center text-xs text-red-500">{profileError}</span>}
                  <button type="button" onClick={cancelProfileEdit} className="px-4 py-2 rounded-lg border border-[var(--color-ink-navy)] text-[var(--color-ink-navy)] text-sm font-semibold">Cancel</button>
                </div>
              </form>
            )}
          </div>
        ) : tab === "orders" ? (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Orders</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Real orders linked to your account. (Requires backend orders module integration.)</p>
            <div className="rounded-xl border border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-warm-muted)]">
              <Package className="h-8 w-8 mx-auto mb-3 text-[var(--color-ink-navy)] opacity-50" />
              <p className="font-medium">No orders yet.</p>
              <p className="text-xs mt-1">Order history is not yet integrated with this account view.</p>
            </div>
          </div>
        ) : tab === "addresses" ? (
          <div className="space-y-3">
            <h2 className="font-display text-xl font-bold">Addresses</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Saved shipping and billing addresses.</p>
            {addressError && <div className="rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700 self-start">{addressError}</div>}
            {addressesLoading ? (
              <div className="animate-pulse h-16 w-full bg-[var(--color-card)] rounded" />
            ) : addresses.length === 0 ? (
              <div className="rounded-lg border border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-warm-muted)]">No addresses yet.</div>
            ) : (
              <div className="space-y-3">
                {addresses.map((a) => (
                  <div key={a.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-5 w-5 rounded-full bg-[var(--color-ink-navy)] text-white text-xs flex items-center justify-center font-semibold mr-1">{a.label[0]}</span>
                        <span className="font-medium text-sm truncate">{a.street}{a.city ? `, ${a.city}${a.state ? `, ${a.state}` : ""}${a.zip ? ` ${a.zip}` : ""}` : ""}</span>
                        {a.isDefault && <span className="inline-block ml-1 text-[var(--color-primary)] text-xs font-semibold">Default</span>}
                      </div>
                      <p className="text-xs text-[var(--color-warm-muted)] mt-1">{a.country}{a.isDefault ? " · Default" : ""}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => startEditAddress(a)} className="text-[var(--color-ink-navy)] hover:underline text-xs px-1" aria-label="Edit"><Edit className="inline h-4 w-4" /></button>
                      {!a.isDefault && <button onClick={async () => { await apiFetch(`/customer/addresses/${a.id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) }); await loadAddresses(); }} className="text-[var(--color-primary)] hover:underline text-xs px-1" aria-label="Set default">Set default</button>}
                      <button onClick={() => deleteAddress(a)} className="text-red-500 hover:underline text-xs px-1" aria-label="Delete"><Trash2 className="inline h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <button onClick={startNewAddress} className="w-full py-2 rounded-lg border border-[var(--color-ink-navy)] text-[var(--color-ink-navy)] text-sm font-semibold">+ New address</button>
                </div>
              </div>
            )}
            {addressFormOpen && (
              <form onSubmit={saveAddress} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] p-4 space-y-3 mt-2">
                <h3 className="font-bold text-sm">{editAddressId ? "Edit" : "New"} Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs">Label</label><input value={addrFields.label} onChange={e => setAddrFields(f => ({ ...f, label: e.target.value }))} required className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm" /></div>
                  <div><label className="block text-xs">Street</label><input value={addrFields.street} onChange={e => setAddrFields(f => ({ ...f, street: e.target.value }))} required className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm" /></div>
                  <div><label className="block text-xs">City</label><input value={addrFields.city} onChange={e => setAddrFields(f => ({ ...f, city: e.target.value }))} required className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm" /></div>
                  <div><label className="block text-xs">State</label><input value={addrFields.state} onChange={e => setAddrFields(f => ({ ...f, state: e.target.value }))} className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm" /></div>
                  <div><label className="block text-xs">ZIP</label><input value={addrFields.zip} onChange={e => setAddrFields(f => ({ ...f, zip: e.target.value }))} className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm" /></div>
                  <div><label className="block text-xs">Country</label><input value={addrFields.country} onChange={e => setAddrFields(f => ({ ...f, country: e.target.value }))} required className="w-full rounded border border-[var(--color-border)] px-2 py-1 text-sm" /></div>
                </div>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!addrFields.isDefault} onChange={e => setAddrFields(f => ({ ...f, isDefault: e.target.checked }))} /> Set as default</label>
                <div className="flex gap-2">
                  <button type="submit" disabled={addressSaving} className="px-3 py-1 rounded bg-[var(--color-primary)] text-white text-xs font-semibold">Save</button>
                  <button type="button" onClick={() => setAddressFormOpen(false)} className="px-3 py-1 rounded border border-[var(--color-ink-navy)] text-[var(--color-ink-navy)] text-xs font-semibold">Cancel</button>
                </div>
                {addressError && <div className="text-xs text-red-600">{addressError}</div>}
              </form>
            )}
          </div>
        ) : tab === "notifications" ? (
          <div className="space-y-3">
            <h2 className="font-display text-xl font-bold">Notifications</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Notification preferences are not yet connected to a live service.</p>
            <div className="rounded-xl border border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-warm-muted)]">
              <Bell className="h-8 w-8 mx-auto mb-3 text-[var(--color-ink-navy)] opacity-50" />
              <p className="font-medium">No notifications configured.</p>
              <p className="text-xs mt-1">Real-time notification settings will appear here when integrated.</p>
            </div>
          </div>
        ) : tab === "security" ? (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Security</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Manage authentication and account access.</p>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] p-4 space-y-2 text-sm">
              <p><span className="font-semibold">Password change:</span> Not yet implemented (requires auth provider integration).</p>
              <p><span className="font-semibold">Active sessions:</span> Not yet tracked locally.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/" className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold">Back to storefront</Link>
              <Link href="/dashboard" className="px-4 py-2 rounded-lg border border-[var(--color-ink-navy)] text-[var(--color-ink-navy)] text-sm font-semibold">Dashboard</Link>
            </div>
            <button onClick={() => { logout(); window.location.href = "/products"; }} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-400 text-red-600 text-sm font-semibold hover:bg-red-50"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
