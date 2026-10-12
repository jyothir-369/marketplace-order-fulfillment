"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Shield, Bell, MapPin, Package, Clock, LogOut, ChevronRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCartStore } from "@/context/CartStore";
import { cn } from "@/lib/utils";

export default function AccountPage() {
  const { user, status, logout } = useAuth();
  const [tab, setTab] = useState("profile");
  const addToCart = useCartStore((s) => s.addToCart);
  const loading = status === "idle" || status === "loading";

  useEffect(() => { if (user && !loading) { /* real data would load here */ } }, [user, loading]);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-6 py-10"><div className="animate-pulse h-8 w-48 bg-[var(--color-card)] rounded mb-6" /><div className="h-64 bg-[var(--color-card)] rounded-2xl" /></div>;
  }
  if (!user) {
    return <div className="max-w-4xl mx-auto px-6 py-10"><h1 className="font-display text-3xl font-bold">Account</h1><p className="text-sm text-[var(--color-warm-muted)] mt-2">Sign in to manage your account.</p><Link href="/login?redirect=/account" className="inline-block mt-4 px-4 py-2 rounded-lg bg-[var(--color-ink-navy)] text-white">Sign in</Link></div>;
  }

  const displayName = user.displayName ?? user.email.split("@")[0];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)] mb-2">Account</h1>
      <p className="text-sm text-[var(--color-warm-muted)] mb-8">Welcome back, <span className="font-medium text-[var(--color-foreground)]">{displayName}</span>.</p>

      <nav className="flex gap-2 mb-8 overflow-x-auto" aria-label="Account tabs">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "orders", label: "Orders", icon: Package },
          { id: "addresses", label: "Addresses", icon: MapPin },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "security", label: "Security", icon: Shield },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition", tab === t.id ? "bg-[var(--color-ink-navy)] text-white border-[var(--color-ink-navy)]" : "bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-brass)]")} aria-pressed={tab === t.id}>
            <t.icon className="h-4 w-4" aria-hidden /> {t.label}
          </button>
        ))}
      </nav>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 min-h-[300px]">
        {tab === "profile" && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Profile</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Name, email, and preferences managed from your account settings.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm"><span className="text-[var(--color-warm-muted)]">Name</span><p className="font-medium">{user.displayName ?? "—"}</p></div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm"><span className="text-[var(--color-warm-muted)]">Email</span><p className="font-medium">{user.email}</p></div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm"><span className="text-[var(--color-warm-muted)]">Role</span><p className="font-medium capitalize">{user.role ?? "customer"}</p></div>
            </div>
          </div>
        )}
        {tab === "orders" && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Orders</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Recent orders linked to your account.</p>
            <div className="rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-[var(--color-ink-navy)] text-white flex items-center justify-center"><Package className="h-5 w-5" /></div>
              <div className="flex-1"><p className="font-bold text-sm">#ORD-1001</p><p className="text-xs text-[var(--color-warm-muted)]">Placed 2026-09-10 · FULFILLED</p></div>
              <Link href="/orders/1001" className="text-xs font-semibold text-[var(--color-brass)] hover:underline">View</Link>
            </div>
            <div className="flex gap-2"><button onClick={() => { addToCart({ productId: "p-1", name: "Coffee Maker", price: 89.99, quantity: 1, maxStock: 40, vendorId: "v-1", vendorName: "Home & Kitchen" }); }} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold">Reorder</button></div>
          </div>
        )}
        {tab === "addresses" && (
          <div className="space-y-3">
            <h2 className="font-display text-xl font-bold">Addresses</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Saved shipping and billing addresses. Add and manage addresses from the vendor/customer backend when available.</p>
            <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm">123 Market St, San Francisco, CA 94103 <span className="inline-block ml-2 text-[var(--color-brass)] text-xs font-semibold">Default</span></div>
          </div>
        )}
        {tab === "notifications" && (
          <div className="space-y-3">
            <h2 className="font-display text-xl font-bold">Notifications</h2>
            <div className="rounded-lg border border-[var(--color-border)] p-4 text-sm"><p>Order #ORD-1001 shipped</p><p className="text-xs text-[var(--color-warm-muted)]">2 hours ago</p></div>
          </div>
        )}
        {tab === "security" && (
          <div className="space-y-3">
            <h2 className="font-display text-xl font-bold">Security</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Manage your password and active sessions.</p>
            <button className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold">Change Password</button>
            <div className="pt-4 border-t border-[var(--color-border)]"><button onClick={async () => { await logout(); window.location.href = "/products"; }} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-ink-navy)] text-[var(--color-ink-navy)] text-sm font-semibold hover:bg-[var(--color-cream)]"><LogOut className="h-4 w-4" /> Sign out</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
