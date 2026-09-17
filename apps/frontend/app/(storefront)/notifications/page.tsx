/**
 * Notification center — Phase 12.
 */
"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function NotificationsPage() {
  const [items, setItems] = useState([
    { id: 1, title: "Order #ORD-1001 fulfilled", desc: "Your item has been delivered.", time: "2h ago", read: false },
    { id: 2, title: "New deal: Electronics 20% off", desc: "Flash deal ends soon.", time: "5h ago", read: true },
  ]);
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold flex items-center gap-3 mb-4"><Bell className="h-8 w-8 text-[var(--color-brass)]" /> Notifications</h1>
      <div className="mb-4">
        <ComingSoon note="Notifications are not wired to a backend yet — no subscription or delivery channel exists. The list below is static demo content." />
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-v2 overflow-hidden">
        {items.map((n) => (
          <div key={n.id} className={"flex items-start gap-4 px-5 py-4 border-b border-[var(--color-border)] hover:bg-[var(--color-cream)]/40" + (n.read ? " bg-[var(--color-cream)]/30" : "")}>
            <button onClick={() => setItems(items.map((i) => i.id === n.id ? { ...i, read: true } : i))} aria-label="Mark read" className="mt-0.5"><CheckCircle2 className={"h-4 w-4 " + (n.read ? "text-[var(--color-forest)]" : "text-[var(--color-warm-subtle)]")} /></button>
            <div className="flex-1"><h3 className="font-display text-sm font-bold">{n.title}</h3><p className="text-xs text-[var(--color-warm-muted)]">{n.desc}</p><p className="text-[10px] text-[var(--color-warm-subtle)] mt-1">{n.time}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
