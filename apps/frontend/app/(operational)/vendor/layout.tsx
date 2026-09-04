/**
 * app/(operational)/vendor/layout.tsx — Vendor portal shell (§4.1).
 *
 * Applies the compact operational density:
 *   - data-surface="operational"
 *   - data-density="compact"
 *
 * ThemeController manages light/dark mode via data-theme on <html>.
 * ErrorBoundary + NetworkStatusBanner wrap the subtree so chart/table crashes
 * don't blank the whole page, and connection drops surface a banner.
 */

import type { Metadata } from "next";
import { OperationalSidebar } from "@/components/operational/OperationalSidebar";
import { ThemeController } from "@/components/operational/ThemeController";
import { ToastProvider } from "@/components/ui/toast";
import { ErrorBoundary } from "@/components/operational/ErrorBoundary";
import { NetworkStatusBanner } from "@/components/order/NetworkStatusBanner";

export const metadata: Metadata = {
  title: {
    template: "%s | Vendor Portal",
    default: "Vendor Portal",
  },
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary label="Vendor portal">
      <div
        className="flex min-h-screen bg-[var(--color-background)]"
        data-surface="operational"
        data-density="compact"
      >
        <OperationalSidebar role="vendor" />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-col">
            <NetworkStatusBanner />
            <div className="flex justify-end p-3">
              <ThemeController />
            </div>
          </div>
          <main className="flex-1 overflow-y-auto px-6 pb-6">
            <ToastProvider>{children}</ToastProvider>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
