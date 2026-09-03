"use client";

import { OperationalSidebar } from "@/components/operational/OperationalSidebar";
import { ToastProvider } from "@/components/ui/toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-base">
      <OperationalSidebar role="admin" />
      <main className="flex-1 overflow-y-auto p-6">
        <ToastProvider>
          {children}
        </ToastProvider>
      </main>
    </div>
  );
}