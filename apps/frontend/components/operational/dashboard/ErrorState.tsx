'use client';

import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="rounded-2xl border border-[var(--color-destructive)] bg-[var(--color-destructive)]/10 p-6" role="alert">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[var(--color-destructive)]/20 flex items-center justify-center">
          <span className="text-[var(--color-destructive)] text-sm font-bold">!</span>
        </div>
        <div>
          <h3 className="font-semibold text-[var(--color-destructive)]">Something went wrong</h3>
          <p className="text-sm text-[var(--color-foreground)]">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm hover:bg-[var(--color-accent)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
