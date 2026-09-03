/**
 * Canonical status vocabulary (§1.2)
 *
 * Single source of truth for every status indicator (Order.status,
 * OrderLineItem.fulfillmentStatus, VendorSyncJob.status). Components must
 * import `STATUS_TOKENS` rather than hard-coding color classes so that the
 * buyer/vendor/admin surfaces stay visually consistent.
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  Inbox,
  Loader2,
  PackageCheck,
  RefreshCw,
  Truck,
  XCircle,
  type LucideIcon as LucideIconType,
} from "lucide-react";

export type StatusDomain = "order" | "lineItem" | "syncJob";

export interface StatusToken {
  /** Stable key (matches enum value from the backend). */
  key: string;
  /** Short uppercase label rendered in badges. */
  label: string;
  /** Which domain this status belongs to. */
  domain: StatusDomain;
  /** Background color class (Tailwind). */
  bgClass: string;
  /** Border color class. */
  borderClass: string;
  /** Text color class. */
  textClass: string;
  /** Leading dot color. */
  dotClass: string;
  /** Icon component. */
  icon: LucideIconType;
  /** Whether the leading dot should pulse (live / in-progress only). */
  pulse: boolean;
}

export const STATUS_TOKENS: Record<string, StatusToken> = {
  // Order lifecycle
  PLACED: {
    key: "PLACED",
    label: "Placed",
    domain: "order",
    bgClass: "bg-sky-50",
    borderClass: "border-sky-200",
    textClass: "text-sky-700",
    dotClass: "bg-sky-500",
    icon: Clock,
    pulse: false,
  },
  CONFIRMED: {
    key: "CONFIRMED",
    label: "Confirmed",
    domain: "order",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    textClass: "text-blue-700",
    dotClass: "bg-blue-500",
    icon: CheckCircle2,
    pulse: false,
  },
  FULFILLING: {
    key: "FULFILLING",
    label: "Fulfilling",
    domain: "order",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    textClass: "text-amber-700",
    dotClass: "bg-amber-500",
    icon: Loader2,
    pulse: true,
  },
  FULFILLED: {
    key: "FULFILLED",
    label: "Fulfilled",
    domain: "order",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    textClass: "text-emerald-700",
    dotClass: "bg-emerald-500",
    icon: PackageCheck,
    pulse: false,
  },
  CANCELLED: {
    key: "CANCELLED",
    label: "Cancelled",
    domain: "order",
    bgClass: "bg-zinc-100",
    borderClass: "border-zinc-300",
    textClass: "text-zinc-700",
    dotClass: "bg-zinc-500",
    icon: XCircle,
    pulse: false,
  },
  FAILED: {
    key: "FAILED",
    label: "Failed",
    domain: "order",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200",
    textClass: "text-rose-700",
    dotClass: "bg-rose-500",
    icon: XCircle,
    pulse: false,
  },

  // Line item fulfillment
  PENDING: {
    key: "PENDING",
    label: "Pending",
    domain: "lineItem",
    bgClass: "bg-zinc-50",
    borderClass: "border-zinc-200",
    textClass: "text-zinc-700",
    dotClass: "bg-zinc-400",
    icon: Hourglass,
    pulse: false,
  },
  IN_PROGRESS: {
    key: "IN_PROGRESS",
    label: "In progress",
    domain: "lineItem",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    textClass: "text-amber-700",
    dotClass: "bg-amber-500",
    icon: Loader2,
    pulse: true,
  },
  SHIPPED: {
    key: "SHIPPED",
    label: "Shipped",
    domain: "lineItem",
    bgClass: "bg-indigo-50",
    borderClass: "border-indigo-200",
    textClass: "text-indigo-700",
    dotClass: "bg-indigo-500",
    icon: Truck,
    pulse: false,
  },
  AMBIGUOUS: {
    key: "AMBIGUOUS",
    label: "Pending reconciliation",
    domain: "lineItem",
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-300",
    textClass: "text-yellow-800",
    dotClass: "bg-yellow-500",
    icon: AlertTriangle,
    pulse: true,
  },
  MANUAL_INTERVENTION_REQUIRED: {
    key: "MANUAL_INTERVENTION_REQUIRED",
    label: "Manual intervention",
    domain: "lineItem",
    bgClass: "bg-orange-50",
    borderClass: "border-orange-300",
    textClass: "text-orange-800",
    dotClass: "bg-orange-500",
    icon: AlertTriangle,
    pulse: false,
  },

  // Sync job (BullMQ) lifecycle
  pending: {
    key: "pending",
    label: "Queued",
    domain: "syncJob",
    bgClass: "bg-zinc-50",
    borderClass: "border-zinc-200",
    textClass: "text-zinc-700",
    dotClass: "bg-zinc-400",
    icon: Inbox,
    pulse: false,
  },
  in_progress: {
    key: "in_progress",
    label: "Running",
    domain: "syncJob",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    textClass: "text-amber-700",
    dotClass: "bg-amber-500",
    icon: Loader2,
    pulse: true,
  },
  completed: {
    key: "completed",
    label: "Completed",
    domain: "syncJob",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    textClass: "text-emerald-700",
    dotClass: "bg-emerald-500",
    icon: CheckCircle2,
    pulse: false,
  },
  failed: {
    key: "failed",
    label: "Failed",
    domain: "syncJob",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200",
    textClass: "text-rose-700",
    dotClass: "bg-rose-500",
    icon: XCircle,
    pulse: false,
  },
  ambiguous: {
    key: "ambiguous",
    label: "Ambiguous",
    domain: "syncJob",
    bgClass: "bg-yellow-50",
    borderClass: "border-yellow-300",
    textClass: "text-yellow-800",
    dotClass: "bg-yellow-500",
    icon: AlertTriangle,
    pulse: true,
  },
  dead_letter: {
    key: "dead_letter",
    label: "Dead letter",
    domain: "syncJob",
    bgClass: "bg-red-50",
    borderClass: "border-red-300",
    textClass: "text-red-800",
    dotClass: "bg-red-600",
    icon: AlertTriangle,
    pulse: false,
  },
  retry: {
    key: "retry",
    label: "Retrying",
    domain: "syncJob",
    bgClass: "bg-violet-50",
    borderClass: "border-violet-200",
    textClass: "text-violet-700",
    dotClass: "bg-violet-500",
    icon: RefreshCw,
    pulse: true,
  },
};

const FALLBACK_TOKEN: StatusToken = {
  key: "UNKNOWN",
  label: "Unknown",
  domain: "order",
  bgClass: "bg-zinc-50",
  borderClass: "border-zinc-200",
  textClass: "text-zinc-700",
  dotClass: "bg-zinc-400",
  icon: AlertTriangle,
  pulse: false,
};

/** Returns the canonical token for an arbitrary status string. */
export function getStatusToken(status: string): StatusToken {
  return STATUS_TOKENS[status] ?? { ...FALLBACK_TOKEN, key: status, label: status };
}

/** Order statuses considered terminal (polling can stop). */
export const TERMINAL_ORDER_STATUSES: ReadonlySet<string> = new Set([
  "FULFILLED",
  "CANCELLED",
  "FAILED",
]);

/** Sync-job statuses considered terminal. */
export const TERMINAL_SYNC_JOB_STATUSES: ReadonlySet<string> = new Set([
  "completed",
  "failed",
  "dead_letter",
]);

export type { LucideIcon };
