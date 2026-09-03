/**
 * app/(operational)/vendor/layout.tsx — Vendor portal shell (§2.2, §2.3).
 *
 * Composition:
 *   - <OperationalSidebar role="vendor">
 *   - Fluid main content area
 *   - Full-height flex layout
 */

"use client";

import { OperationalSidebar } from "@/components/operational/OperationalSidebar";

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-100">
      <OperationalSidebar role="vendor" />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}