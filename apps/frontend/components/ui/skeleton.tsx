import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        "rounded-md bg-[var(--color-ivory-muted)] animate-pulse",
        className
      )}
    />
  );
}

export function CatalogGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--color-card)] border border-[var(--color-warm-border)] rounded-2xl overflow-hidden shadow-v2"
        >
          {/* Gradient banner placeholder */}
          <div className="aspect-[4/3] bg-gradient-to-br from-[var(--color-ivory-muted)] to-[var(--color-cream)] animate-pulse" />
          {/* Card body */}
          <div className="p-5 space-y-3">
            <Skeleton height="1rem" width="55%" />
            <Skeleton height="1.75rem" width="80%" className="mt-1" />
            <Skeleton height="0.875rem" width="45%" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton height="1.5rem" width="5rem" />
              <Skeleton height="2rem" width="5rem" className="rounded-full" />
            </div>
            <Skeleton height="2.5rem" width="100%" className="mt-3 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton height="2.25rem" width="50%" />
        <Skeleton height="1rem" width="30%" />
      </div>
      <div className="border border-[var(--color-warm-border)] rounded-2xl p-5 space-y-3 bg-[var(--color-card)]">
        <Skeleton height="1rem" width="40%" />
        <Skeleton height="1rem" />
        <Skeleton height="1rem" width="80%" />
      </div>
      <div className="border border-[var(--color-warm-border)] rounded-2xl p-5 space-y-3 bg-[var(--color-card)]">
        <Skeleton height="1rem" width="30%" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </div>
    </div>
  );
}