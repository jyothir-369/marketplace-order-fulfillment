import { Suspense } from "react";
import { OverviewPageClient } from "@/components/operational/dashboard/OverviewPageClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OverviewPageClient />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-72 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] animate-pulse" />
        <div className="h-72 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] animate-pulse" />
      </div>
    </div>
  );
}
