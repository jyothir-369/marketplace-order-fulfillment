"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UserRound,
  ChevronDown,
  ShoppingBag,
  Store,
  LayoutDashboard,
  LogOut,
  Heart,
  Bell,
  User,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const computePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    computePos();
    const onResize = () => computePos();
    const onScroll = () => computePos();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, computePos]);

  // Click outside (trigger + portal)
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || portalRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Route change close
  useEffect(() => { setOpen(false); }, [pathname]);

  const loading = status === "idle" || status === "loading";

  if (loading) {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-warm-border)]"
        aria-label="Loading account"
      >
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brass)]" />
      </span>
    );
  }

  if (!user) {
    return (
      <div className="hidden items-center gap-1.5 sm:flex">
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname ?? "/")}`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-cream)]/60 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-navy)] border border-[var(--color-ink-navy)] hover:bg-[var(--color-cream)]/80 transition-colors"
        >
          Create account
        </Link>
      </div>
    );
  }

  const showVendorPortal = user.role === "vendor";
  const showAdminConsole = user.role === "admin" || user.role === "operations";
  const displayName = user.displayName ?? user.email.split("@")[0];

  async function handleSignOut() {
    await logout();
    router.push("/products");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) setTimeout(computePos, 0); }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium",
          "text-[var(--color-foreground)] hover:bg-[var(--color-cream)]/60 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-brass)]/40",
        )}
      >
        <UserRound className="h-4 w-4 text-[var(--color-brass)]" aria-hidden />
        <span className="hidden md:inline max-w-[10rem] truncate">{displayName}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-[var(--color-warm-muted)] transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {mounted && open && pos && createPortal(
        <div
          ref={portalRef}
          role="menu"
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-56 overflow-hidden rounded-xl border border-[var(--color-warm-border)] bg-white shadow-2xl"
        >
          <div className="border-b border-[var(--color-warm-border)] px-3.5 py-2.5">
            <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
              {user.displayName ?? user.email}
            </p>
            <p className="truncate text-xs text-[var(--color-warm-muted)]">{user.email}</p>
          </div>

          <div className="p-1.5">
            <MenuItem href="/orders" icon={ShoppingBag} label="My Orders" onNavigate={() => setOpen(false)} />
            <MenuItem href="/wishlist" icon={Heart} label="Wishlist" onNavigate={() => setOpen(false)} />
            <MenuItem href="/notifications" icon={Bell} label="Notifications" onNavigate={() => setOpen(false)} />
            <MenuItem href="/account" icon={User} label="Account" onNavigate={() => setOpen(false)} />
            <MenuItem href="/account/addresses" icon={MapPin} label="Saved Addresses" onNavigate={() => setOpen(false)} />
            {showVendorPortal && (
              <MenuItem href="/vendor/dashboard" icon={Store} label="Vendor Portal" onNavigate={() => setOpen(false)} />
            )}
            {showAdminConsole && (
              <MenuItem href="/admin" icon={LayoutDashboard} label="Admin Console" onNavigate={() => setOpen(false)} />
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => { handleSignOut(); setOpen(false); }}
              className={menuItemClasses}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const menuItemClasses =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-cream)]/70 transition-colors";

function MenuItem({
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onNavigate} className={menuItemClasses}>
      <Icon className="h-4 w-4 text-[var(--color-warm-muted)]" aria-hidden />
      {label}
    </Link>
  );
}
