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
      className={cn("rounded-md bg-[var(--muted)] animate-pulse", className)}
    />
  );
}

export function CatalogGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 flex flex-col gap-3"
        >
          <Skeleton height="1rem" width="70%" />
          <Skeleton height="0.75rem" width="40%" />
          <div className="flex justify-between items-center mt-2">
            <Skeleton height="1.5rem" width="4rem" />
            <Skeleton height="1.25rem" width="5rem" />
          </div>
          <Skeleton height="2.25rem" />
        </div>
      ))}
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton height="2rem" width="50%" />
        <Skeleton height="1rem" width="30%" />
      </div>
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <Skeleton height="1rem" width="40%" />
        <Skeleton height="1rem" />
        <Skeleton height="1rem" width="80%" />
      </div>
      <div className="border border-[var(--border)] rounded-lg p-4 space-y-3">
        <Skeleton height="1rem" width="30%" />
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
      </div>
    </div>
  );
}
