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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--color-warm-border)] bg-[var(--color-card)] shadow-lg"
        >
          <div className="border-b border-[var(--color-warm-border)] px-3.5 py-2.5">
            <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
              {user.displayName ?? user.email}
            </p>
            <p className="truncate text-xs text-[var(--color-warm-muted)]">{user.email}</p>
          </div>

          <div className="p-1.5">
            <MenuItem href="/orders" icon={ShoppingBag} label="My Orders" onNavigate={() => setOpen(false)} />
            <MenuItem href="/wishlist" icon={Heart} label="Recently Viewed" onNavigate={() => setOpen(false)} />
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
        </div>
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