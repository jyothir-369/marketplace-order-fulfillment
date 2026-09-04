"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { resolveLineItem } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const RESOLVE_STATUSES = ["FULFILLED", "FAILED", "CANCELLED", "MANUAL_INTERVENTION_REQUIRED"];

interface ResolveLineItemDialogProps {
  lineItemId: string;
  orderId: string;
  onClose: () => void;
  onResolved: () => void;
}

export function ResolveLineItemDialog({ lineItemId, orderId, onClose, onResolved }: ResolveLineItemDialogProps) {
  const { push: toast } = useToast();
  const [newStatus, setNewStatus] = useState("FULFILLED");
  const [reason, setReason] = useState("Resolved by admin");
  const [vendorRef, setVendorRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await resolveLineItem(lineItemId, {
        newFulfillmentStatus: newStatus,
        reason,
        vendorReference: vendorRef || undefined,
      });
      toast(res.message ?? `Line item resolved`, "success");
      onResolved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resolve line item";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-lg border border-border bg-surface-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold text-text-primary">Resolve Line Item</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-surface-base" aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <fieldset disabled={submitting} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">Line Item</label>
            <p className="font-mono text-xs text-text-primary">{lineItemId}</p>
            <p className="mt-0.5 text-xs text-text-muted">Order {orderId}</p>
          </div>
          <div>
            <label htmlFor="resolve-status" className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">New Status</label>
            <select
              id="resolve-status"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="w-full rounded border border-border bg-surface-base px-3 py-2 text-sm"
              required
            >
              {RESOLVE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="resolve-reason" className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">Reason</label>
            <textarea
              id="resolve-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full rounded border border-border bg-surface-base px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="resolve-vendorref" className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">Vendor Reference (optional)</label>
            <input
              id="resolve-vendorref"
              type="text"
              value={vendorRef}
              onChange={e => setVendorRef(e.target.value)}
              className="w-full rounded border border-border bg-surface-base px-3 py-2 text-sm"
            />
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded border border-border px-4 py-2 text-sm hover:bg-surface-base disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Resolving..." : "Resolve"}
          </button>
        </div>
      </form>
    </div>
  );
}
