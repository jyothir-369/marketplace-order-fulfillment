/**
 * OperationalSidebar — navigation sidebar for operational portals (vendor/admin).
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutGrid, Package, ShoppingCart, AlertTriangle,
  BarChart3, ClipboardList, DatabaseZap, LayoutDashboard,
  FolderTree, Building2, FileCheck, Tag, Settings, LogOut,
} from "lucide-react";

type Role = "vendor" | "admin";
interface NavItem { href: string; label: string; icon: React.ComponentType<Record<string, unknown>>; badge?: string | number; }
interface OperationalSidebarProps { role: Role; footer?: React.ReactNode; }
const ROLE_LABELS: Record<Role, string> = { vendor: "Vendor Portal", admin: "Admin Console" };
const VENDOR_NAV: NavItem[] = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/products", label: "Products", icon: Package },
  { href: "/vendor/inventory", label: "Inventory", icon: LayoutGrid },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingCart },
  { href: "/vendor/promotions", label: "Promotions", icon: Tag },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendor/settings", label: "Settings", icon: Settings },
  { href: "/vendor/dead-letter", label: "Dead-Letter", icon: AlertTriangle },
];
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/orders", label: "All Orders", icon: ClipboardList },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/vendors", label: "Vendors", icon: Building2 },
  { href: "/admin/vendor-applications", label: "Vendor Applications", icon: FileCheck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/dead-letter", label: "Dead-Letter", icon: AlertTriangle },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: DatabaseZap },
];

export function OperationalSidebar({ role, footer }: OperationalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const navItems = role === "vendor" ? VENDOR_NAV : ADMIN_NAV;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); } catch { /* ignore */ }
    router.push("/products");
  };

  return (
    <aside className="w-52 shrink-0 bg-[hsl(var(--color-sidebar-bg))] text-[hsl(var(--color-sidebar-text))] flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-[hsl(var(--color-sidebar-border))]">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-5 w-5 text-[hsl(var(--color-sidebar-tag-vendor-text))]" aria-hidden />
          <span className="font-bold text-sm">{ROLE_LABELS[role]}</span>
        </div>
        <span className={["inline-block text-xs px-1.5 py-0.5 rounded font-medium uppercase tracking-wide",
          role === "vendor" ? "bg-[hsl(var(--color-sidebar-tag-vendor-bg))] text-[hsl(var(--color-sidebar-tag-vendor-text))]" : "bg-[hsl(var(--color-sidebar-tag-admin-bg))] text-[hsl(var(--color-sidebar-tag-admin-text))]"].join(" ")}>
          {role}
        </span>
      </div>
      <nav className="flex-1 py-2" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (pathname ?? '').startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={["flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
              isActive ? "bg-[hsl(var(--color-sidebar-active-bg))] text-[hsl(var(--color-sidebar-text))]" : "text-[hsl(var(--color-sidebar-text-muted))] hover:bg-[hsl(var(--color-sidebar-hover))] hover:text-[hsl(var(--color-sidebar-text))]"].join(" ")} aria-current={isActive ? "page" : undefined}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-[hsl(var(--color-sidebar-border))]">
        <button onClick={handleLogout} disabled={loggingOut} aria-label="Logout"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[hsl(var(--color-sidebar-text-muted))] hover:bg-[hsl(var(--color-sidebar-hover))] hover:text-[hsl(var(--color-sidebar-text))] transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed">
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left font-medium">{loggingOut ? "Signing out..." : "Logout"}</span>
        </button>
      </div>
      {footer && (
        <div className="border-t border-[hsl(var(--color-sidebar-border))] px-4 py-3 text-xs text-[hsl(var(--color-sidebar-text-muted))]">{footer}</div>
      )}
    </aside>
  );
}
