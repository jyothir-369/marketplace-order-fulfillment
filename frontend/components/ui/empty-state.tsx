import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
      role="status"
    >
      <div className="text-[var(--muted-foreground)] opacity-60">
        {icon ?? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={48}
            height={48}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <path d="M3 10h18" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        )}
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
