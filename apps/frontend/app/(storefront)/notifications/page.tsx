/**
 * Notifications center — Phase 2 improvements.
 * Reads from local demo state; no backend subscription required yet.
 */
"use client";

import { Bell, CheckCircle2, RefreshCcw } from "lucide-react";
import { useState, useCallback } from "react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function NotificationsPage() {
  const [items, setItems] = useState([
    { id: 1, title: "Order #ORD-1001 fulfilled", desc: "Your item has been delivered.", time: "2h ago", read: false, type: "order" },
    { id: 2, title: "New deal: Electronics 20% off", desc: "Flash deal ends soon.", time: "5h ago", read: true, type: "deal" },
    { id: 3, title: "Price drop: Kitchen Set", desc: "Your wishlist item dropped 15%.", time: "1d ago", read: false, type: "wishlist" },
  ]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = useCallback((id: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Bell className="h-8 w-8 text-[var(--color-brass)]" aria-hidden />
          Notifications
        </h1>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-[var(--color-ink-navy)] text-[var(--color-brass)] px-2.5 py-0.5 text-xs font-bold tabular-nums">
              {unreadCount} unread
            </span>
          )}
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-medium text-[var(--color-ink-navy)] hover:text-[var(--color-foreground)] underline underline-offset-2"
            aria-label="Mark all as read"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="mb-4">
        <ComingSoon note="Notifications are not fully wired to a backend subscription yet — read/unread state and types are interactive below." />
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-v2 overflow-hidden">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => markRead(n.id)}
            aria-label={`Mark ${n.title} as read`}
            className={
              "w-full text-left flex items-start gap-4 px-5 py-4 border-b border-[var(--color-border)] hover:bg-[var(--color-cream)]/40 transition-colors " +
              (n.read ? " bg-[var(--color-cream)]/30" : "")
            }
          >
            <span className="mt-0.5 shrink-0" aria-hidden>
              <CheckCircle2
                className={
                  "h-4 w-4 " +
                  (n.read ? "text-[var(--color-forest)]" : "text-[var(--color-warm-subtle)]")
                }
              />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold truncate">{n.title}</h3>
                <span
                  className={
                    "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md " +
                    (n.type === "order" ? "bg-[var(--color-forest)]/10 text-[var(--color-forest)]" : n.type === "deal" ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]" : "bg-[var(--color-ink-navy)]/10 text-[var(--color-ink-navy)]")
                  }
                >
                  {n.type}
                </span>
              </div>
              <p className="text-xs text-[var(--color-warm-muted)]">{n.desc}</p>
              <p className="text-[10px] text-[var(--color-warm-subtle)] mt-1">{n.time}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-[var(--color-warm-subtle)]">
        <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
        <span>Refresh to update notification status.</span>
      </div>
    </div>
  );
}
