'use client';
import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: Props) {
  useEffect(() => {
    console.error('[global] error:', error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="bg-[hsl(var(--color-destructive)/0.08)] border border-[hsl(var(--color-destructive)/0.25)] rounded-lg p-8 max-w-md text-center">
        <h2 className="text-xl font-semibold text-[hsl(var(--color-destructive))] mb-3">
          Something went wrong
        </h2>
        <p className="text-sm text-[hsl(var(--color-muted-foreground))] mb-4">
          An unexpected error occurred. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="bg-[hsl(var(--color-muted))] text-[hsl(var(--color-foreground))] text-xs rounded p-2 mb-4 overflow-auto text-left">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={reset}
          className="bg-[hsl(var(--color-destructive))] hover:bg-[hsl(var(--color-destructive))] text-[hsl(var(--color-destructive-foreground))] px-5 py-2 rounded font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
