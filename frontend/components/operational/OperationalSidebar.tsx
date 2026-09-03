/**
 * OperationalSidebar — navigation sidebar for operational portals (vendor/admin) (§2.2, §2.3).
 *
 * Props:
 *   role  — "vendor" or "admin" — drives nav links and the role badge
 *   vendorId — required when role is "vendor" (for DLQ filtering)
 *
 * Applies the high-density operational mode grammar:
 *   - Compact sidebar (200px fixed)
 *   - 40px row heights, tabular data
 *   - No decorative whitespace
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  DatabaseZap,
} from "lucide-react";

type Role = "vendor" | "admin";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<Record<string, unknown>>;
  badge?: string | number;
}

interface OperationalSidebarProps {
  role: Role;
  /** Extra items shown in the sidebar footer (e.g. health status). */
  footer?: React.ReactNode;
}

const ROLE_LABELS: Record<Role, string> = {
  vendor: "Vendor Portal",
  admin: "Admin Console",
};

const VENDOR_NAV: NavItem[] = [
  { href: "/vendor/inventory", label: "Inventory", icon: LayoutGrid },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingCart },
  { href: "/vendor/dead-letter", label: "Dead-Letter", icon: AlertTriangle },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/orders", label: "All Orders", icon: ClipboardList },
  { href: "/admin/dead-letter", label: "Dead-Letter", icon: AlertTriangle },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: DatabaseZap },
];

export function OperationalSidebar({ role, footer }: OperationalSidebarProps) {
  const pathname = usePathname();
  const navItems = role === "vendor" ? VENDOR_NAV : ADMIN_NAV;

  return (
    <aside className="w-52 shrink-0 bg-zinc-900 text-white flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-700">
        <div className="flex items-center gap-2 mb-1">
          <Package className="h-5 w-5 text-indigo-400" aria-hidden />
          <span className="font-bold text-sm">{ROLE_LABELS[role]}</span>
        </div>
        <span
          className={[
            "inline-block text-xs px-1.5 py-0.5 rounded font-medium uppercase tracking-wide",
            role === "vendor"
              ? "bg-indigo-900 text-indigo-300"
              : "bg-red-900 text-red-300",
          ].join(" ")}
        >
          {role}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                aria-hidden
              />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-zinc-700 px-4 py-3 text-xs text-zinc-500">
          {footer}
        </div>
      )}
    </aside>
  );
}