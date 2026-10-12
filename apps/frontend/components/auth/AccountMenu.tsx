/**
 * components/auth/AccountMenu.tsx — storefront header account control (Phase 1).
 *
 *   - Unauthenticated: "Sign in" / "Create account" links.
 *   - Authenticated: a user avatar dropdown showing the account email plus
 *     role-aware portals (Vendor Portal for vendors, Admin Console for
 *     admin/operations) and a Sign out action.
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside + route-change close.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  // Dynamic portal positioning anchored to button; close on scroll/resize
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 8,
      right: window.innerWidth - rect.right,
    });
    const onResize = () => {
      if (!buttonRef.current) return;
      const r = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + window.scrollY + 8, right: window.innerWidth - r.right });
    };
    const onScroll = () => setOpen(false);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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
          href={`/login?redirect=${encodeURIComponent(pathname ?? '')}`}
          className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-card)]/60 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-navy)] border border-[var(--color-ink-navy)] hover:bg-[var(--color-card)]/80 transition-colors"
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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium",
          "text-[var(--color-foreground)] hover:bg-[var(--color-card)]/60 transition-colors",
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

      {open && createPortal(
        <div
          role="menu"
          className="fixed w-56 overflow-hidden rounded-xl border-2 border-[var(--color-ink-navy)] bg-[var(--color-card)] shadow-[0_25px_60px_rgba(0,0,0,0.35)] z-[9999]"
          style={{
            position: "fixed",
            top: dropdownPos.top,
            right: dropdownPos.right,
          }}
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
            <MenuItem href="/account" icon={MapPin} label="Saved Addresses" onNavigate={() => setOpen(false)} />
            {showVendorPortal && (
              <MenuItem href="/vendor/dashboard" icon={Store} label="Vendor Portal" onNavigate={() => setOpen(false)} />
            )}
            {showAdminConsole && (
              <MenuItem href="/admin" icon={LayoutDashboard} label="Admin Console" onNavigate={() => setOpen(false)} />
            )}
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className={cn(menuItemClasses)}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>,
        (typeof document !== "undefined" && document.body ? document.body : document.createElement("div")) as Element
      )}
    </div>
  );
}

const menuItemClasses =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-card)]/70 transition-colors";

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