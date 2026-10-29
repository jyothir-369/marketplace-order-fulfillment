/**
 * OperationalSidebar — navigation sidebar for operational portals (vendor/admin).
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutGrid, Package, ShoppingCart, AlertTriangle,
  BarChart3, ClipboardList, DatabaseZap, LayoutDashboard,
  FolderTree, Building2, FileCheck, Tag, Settings, LogOut, DollarSign, ChevronDown, ChevronRight,
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
  { href: "/vendor/payouts", label: "Payouts", icon: DollarSign },
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
const ADMIN_PAYMENTS_PARENT: NavItem & { children?: NavItem[] } = {
  href: "/admin/payments",
  label: "Payments",
  icon: DollarSign,
  children: [
    { href: '/admin/payments', label: 'Split Payments Ledger', icon: DollarSign },
    { href: '/admin/payments/refunds', label: 'Refunds', icon: DollarSign },
    { href: '/admin/payments/disputes', label: 'Disputes', icon: AlertTriangle },
  ],
};
const ADMIN_NAV_FINAL: NavItem[] = [...ADMIN_NAV, ADMIN_PAYMENTS_PARENT];

type NavChildItem = NavItem;
type NavParentItem = NavItem & { children: NavChildItem[] };
function isNavParent(item: NavItem | NavParentItem): item is NavParentItem { return Array.isArray((item as NavParentItem).children); }

export function OperationalSidebar({ role, footer }: OperationalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);

  const navItems = role === "vendor" ? VENDOR_NAV : ADMIN_NAV_FINAL;

  // Auto-expand Payments when any child route active; also set from direct URL
  const paymentChildPaths = ['/admin/payments', '/admin/payments/refunds', '/admin/payments/disputes'];
  const isPaymentActive = paymentChildPaths.some(p => pathname === p);
  useEffect(() => { if (isPaymentActive) setPaymentsOpen(true); }, [isPaymentActive]);

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
          if (Array.isArray((item as any).children)) {
            const pItem = item as any;
            const pActive = pItem.children.some((ch: any) => pathname === ch.href);
            const expanded = paymentsOpen || pActive;
            return (
              <div key={item.href} className="flex flex-col">
                <button type="button" onClick={() => setPaymentsOpen(!paymentsOpen)} aria-expanded={expanded} aria-controls="payments-submenu" className={["flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors w-full text-left", pActive ? "bg-[hsl(var(--color-sidebar-active-bg))] text-[hsl(var(--color-sidebar-text))]" : "text-[hsl(var(--color-sidebar-text-muted))] hover:bg-[hsl(var(--color-sidebar-hover))] hover:text-[hsl(var(--color-sidebar-text))]"]
                  .join(" ")}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                </button>
                {expanded && (
                  <div id="payments-submenu" className="flex flex-col" role="group" aria-label="Payments submenu">
                    {(pItem.children || []).map((child: any) => {
                      if (child.kind === 'group') return null;
                      const href = child.href;
                      const lab = child.label;
                      const CI = child.icon || DollarSign;
                      const act = pathname === href;
                      return (
                        <Link key={href} href={href} className={["flex items-center gap-2.5 px-8 py-2 text-sm transition-colors", act ? "bg-[hsl(var(--color-sidebar-active-bg))]/70 text-[hsl(var(--color-sidebar-text))] font-medium" : "text-[hsl(var(--color-sidebar-text-muted))] hover:bg-[hsl(var(--color-sidebar-hover))] hover:text-[hsl(var(--color-sidebar-text))]"]
                          .join(" ")} aria-current={act ? "page" : undefined}>
                          <CI className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="flex-1">{lab}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const isActive = pathname === item.href || (pathname ?? '').startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={["flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors", isActive ? "bg-[hsl(var(--color-sidebar-active-bg))] text-[hsl(var(--color-sidebar-text))]" : "text-[hsl(var(--color-sidebar-text-muted))] hover:bg-[hsl(var(--color-sidebar-hover))] hover:text-[hsl(var(--color-sidebar-text))]"]
              .join(" ")} aria-current={isActive ? "page" : undefined}>
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
