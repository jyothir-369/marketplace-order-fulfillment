import { getStatusToken } from "@/lib/status-tokens";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "default";
}

export function StatusBadge({ status, label, size = "default" }: StatusBadgeProps) {
  const token = getStatusToken(status);
  const Icon = token.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border rounded font-semibold uppercase tracking-wide",
        token.bgClass,
        token.borderClass,
        token.textClass,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      )}
      role="status"
      aria-label={token.label}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          token.dotClass,
          token.pulse ? "animate-pulse" : ""
        )}
        aria-hidden
      />
      <Icon
        className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")}
        aria-hidden
      />
      {label ?? token.label}
    </span>
  );
}
