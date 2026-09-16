"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Shield, Bell, MapPin, Package, Clock } from "lucide-react";
import { useCartStore } from "@/context/CartStore";
import { cn } from "@/lib/utils";

export default function AccountPage() {
  const [tab, setTab] = useState("profile");
  const addToCart = useCartStore((s) => s.addToCart);
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-[var(--color-foreground)] mb-8">Account</h1>
      <nav className="flex gap-2 mb-8 overflow-x-auto" aria-label="Account tabs">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "orders", label: "Orders", icon: Package },
          { id: "addresses", label: "Addresses", icon: MapPin },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "security", label: "Security", icon: Shield },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition", tab === t.id ? "bg-[var(--color-ink-navy)] text-white border-[var(--color-ink-navy)]" : "bg-[var(--color-card)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-brass)]")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </nav>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-v2 min-h-[300px]">
        {tab === "profile" && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Profile</h2>
            <p className="text-sm text-[var(--color-warm-muted)]">Name, email, and preferences managed from your account settings.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input defaultValue="Buyer" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm" readOnly />
              <input defaultValue="buyer@example.com" className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] px-3 py-2 text-sm" readOnly />
            </div>
          </div>
        )}
        {tab === "orders" && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Orders</h2>
            <div className="rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-[var(--color-ink-navy)] text-white flex items-center justify-center"><Package className="h-5 w-5" /></div>
              <div className="flex-1"><p className="font-bold text-sm">#ORD-1001</p><p className="text-xs text-[var(--color-warm-muted)]">Placed 2026-09-10 · FULFILLED</p></div>
              <Link href="/orders/1001" className="text-xs font-semibold text-[var(--color-brass)] hover:underline">View</Link>
            </div>
            <div className="flex gap-2"><button onClick={() => { addToCart({ productId: "p-1", name: "Coffee Maker", price: 89.99, quantity: 1, maxStock: 40, vendorId: "v-1", vendorName: "Home & Kitchen" }); }} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold">Reorder</button></div>
          </div>
        )}
        {tab === "addresses" && (
          <div className="space-y-3"><h2 className="font-display text-xl font-bold">Addresses</h2><p className="text-sm text-[var(--color-warm-muted)]">Saved shipping and billing addresses.</p><div className="rounded-lg border border-[var(--color-border)] p-4 text-sm">123 Market St, San Francisco, CA 94103</div></div>
        )}
        {tab === "notifications" && (
          <div className="space-y-3"><h2 className="font-display text-xl font-bold">Notifications</h2><div className="rounded-lg border border-[var(--color-border)] p-4 text-sm"><p>Order #ORD-1001 shipped</p><p className="text-xs text-[var(--color-warm-muted)]">2 hours ago</p></div></div>
        )}
        {tab === "security" && (
          <div className="space-y-3"><h2 className="font-display text-xl font-bold">Security</h2><p className="text-sm text-[var(--color-warm-muted)]">Change password and manage sessions.</p><button className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold">Change Password</button></div>
        )}
      </div>
    </div>
  );
}
