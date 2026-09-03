/**
 * app/(operational)/admin/layout.tsx — Admin route group layout (§4.1).
 *
 * Applies the compact operational density:
 *   - data-surface="operational"
 *   - data-density="compact"
 *
 * ThemeController manages light/dark mode via data-theme on <html>.
 */

import type { Metadata } from "next";
import { OperationalSidebar } from "@/components/operational/OperationalSidebar";
import { ThemeController } from "@/components/operational/ThemeController";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    template: "%s | Admin Portal",
    default: "Admin Portal",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen bg-[var(--color-background)]"
      data-surface="operational"
      data-density="compact"
    >
      <OperationalSidebar role="admin" />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Theme toggle in the top-right corner */}
        <div className="flex justify-end p-3">
          <ThemeController />
        </div>
        <main className="flex-1 overflow-y-auto px-6 pb-6">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
