'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  /** Optional label used in the UI e.g. "products catalog" */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Client-side React ErrorBoundary.
 *
 * Usage:
 *   <ErrorBoundary name="OrderConfirmation">
 *     <OrderConfirmationPage />
 *   </ErrorBoundary>
 *
 * When an error bubbles up inside children, this component catches it,
 * renders a friendly message, and offers a Retry button that calls
 * the optional onReset callback or force-re-renders children in-place.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const label = this.props.name ?? 'page';

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-48 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Something went wrong
            </h2>

            <p className="text-sm text-red-700 mb-4">
              An unexpected error occurred while loading the {label}. This has been
              recorded and you can retry below.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-4">
                <summary className="text-xs text-red-600 cursor-pointer mb-1">
                  Technical details
                </summary>
                <pre className="bg-red-100 border border-red-200 rounded p-2 text-xs overflow-auto text-red-800">
                  {this.state.error.name}: {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      {'\n\n'}
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}