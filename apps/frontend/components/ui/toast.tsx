"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  CheckCircle2,
  Info,
  XCircle,
  X,
  AlertTriangle,
} from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

const variantClasses: Record<ToastVariant, string> = {
  success: "bg-emerald-50 border border-emerald-300 text-emerald-900",
  error: "bg-red-50 border border-red-300 text-red-900",
  info: "bg-sky-50 border border-sky-200 text-sky-900",
  warning: "bg-amber-50 border border-amber-300 text-amber-900",
};

// Each icon accepts className + aria-hidden + lucide SVG props (size etc).
type ToastIcon = React.ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
  size?: number | string;
}>;

const iconMap: Record<ToastVariant, ToastIcon> = {
  success: CheckCircle2 as unknown as ToastIcon,
  error: XCircle as unknown as ToastIcon,
  info: Info as unknown as ToastIcon,
  warning: AlertTriangle as unknown as ToastIcon,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = iconMap[toast.variant];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        "flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg min-w-72 max-w-sm",
        "transition-all duration-300 ease-in-out",
        variantClasses[toast.variant],
      ].join(" ")}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-label="Notifications" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_ID = (() => {
  let n = 0;
  return () => `toast-${++n}`;
})();

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, variant: ToastVariant = "info") => {
    setToasts((prev) => [...prev, { id: AUTO_ID(), message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast() must be called inside a <ToastProvider>");
  return ctx;
}

// Module-level singleton (non-React callers)
export const toast = {
  _listeners: [] as Array<(t: Toast) => void>,
  push(message: string, variant: ToastVariant = "info") {
    const item: Toast = { id: AUTO_ID(), message, variant };
    this._listeners.forEach((fn) => fn(item));
  },
  onAdd(fn: (t: Toast) => void) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter((f) => f !== fn);
    };
  },
};
