/**
 * Coming-soon banner — marks Phase 5.2 features whose backend is deferred.
 * The UI remains visible (as a demo of the planned surface) but the badge makes
 * it unambiguous that nothing here is live or persisted yet.
 */
import { Clock } from "lucide-react";

export function ComingSoon({
  title = "Coming soon",
  note,
}: {
  title?: string;
  note: string;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-dashed border-[var(--color-warm-border-strong)] bg-[var(--color-ivory)] px-4 py-3 text-sm"
    >
      <Clock className="h-4 w-4 text-[var(--color-warm-muted)] shrink-0 mt-0.5" aria-hidden />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          {title}
        </p>
        <p className="mt-0.5 text-[var(--color-warm-muted)]">{note}</p>
      </div>
    </div>
  );
}