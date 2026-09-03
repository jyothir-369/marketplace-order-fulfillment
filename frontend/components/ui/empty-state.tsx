/**
 * EmptyState — friendly placeholder when a list or resource has no data (§1.3).
 *
 * Slots:
 * - icon     : any ReactNode (emoji, SVG, or lucide Icon)
 * - title    : primary headline
 * - description : optional supporting paragraph
 * - action   : optional CTA button (pass the <button> element)
 *
 * Usage:
 *   <EmptyState
 *     icon={<Package size={40} />}
 *     title="No orders yet"
 *     description="Your placed orders will appear here."
 *     action={<Button onClick={handleShop}>Browse products</Button>}
 *   />
 */

import { Inbox } from "lucide-react";

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
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className,
      ].join(" ")}
      role="status"
    >
      <div className="text-zinc-300">
        {icon ?? <Inbox size={48} aria-hidden />}
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-700">{title}</h2>
        {description && (
          <p className="text-sm text-zinc-500 max-w-sm">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
