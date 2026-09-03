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
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md text-center">
        <h2 className="text-xl font-semibold text-red-800 mb-3">
          Something went wrong
        </h2>
        <p className="text-sm text-red-700 mb-4">
          An unexpected error occurred. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="bg-red-100 text-red-900 text-xs rounded p-2 mb-4 overflow-auto text-left">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={reset}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}