"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Allocation = {
  id: string | number;
  orderReference?: string | null;
  amountPaise?: number | null;
  commissionPaise?: number | null;
  currency?: string | null;
  rulesVersion?: string | null;
  createdAt?: string | null;
  status?: string | null;
};

type AllocationResponse =
  | Allocation[]
  | { allocations?: Allocation[] }
  | { data?: Allocation[]; allocations?: Allocation[] };

export default function VendorPayoutsPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllocations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<AllocationResponse>(
        "/vendor/payments/allocations"
      );

      let rows: Allocation[];

      if (Array.isArray(result)) {
        rows = result;
      } else if (Array.isArray(result?.allocations)) {
        rows = result.allocations;
      } else if ("data" in result && Array.isArray(result.data)) {
        rows = result.data;
      } else {
        throw new Error(
          "The allocations endpoint returned an unexpected response format."
        );
      }

      setAllocations(rows);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load vendor allocations. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllocations();
  }, [loadAllocations]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Vendor Payouts
        </h1>
        <p className="text-sm text-gray-600">
          View payment allocations associated with your vendor account.
          An allocation does not mean that a provider transfer has completed.
        </p>
      </header>

      <section
        aria-labelledby="allocation-heading"
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="allocation-heading" className="text-lg font-semibold">
            Payment allocations
          </h2>

          <button
            type="button"
            onClick={() => void loadAllocations()}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {loading && (
          <p role="status" aria-busy="true" className="py-6 text-sm text-gray-600">
            Loading allocations…
          </p>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">Allocations could not be loaded.</p>
            <p className="break-words">{error}</p>
            <p>
              Check that the backend is running, your session is valid, and the
              vendor allocations endpoint is available.
            </p>
            <button
              type="button"
              onClick={() => void loadAllocations()}
              className="rounded-md border border-red-300 px-3 py-2 font-medium hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && allocations.length === 0 && (
          <div className="rounded-lg bg-gray-50 px-4 py-8 text-center">
            <p className="font-medium text-gray-800">No allocations found</p>
            <p className="mt-2 text-sm text-gray-600">
              Allocations will appear here when available for your vendor
              account.
            </p>
          </div>
        )}

        {!loading && !error && allocations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 font-semibold">Order reference</th>
                  <th className="p-3 font-semibold">Amount (paise)</th>
                  <th className="p-3 font-semibold">Commission (paise)</th>
                  <th className="p-3 font-semibold">Currency</th>
                  <th className="p-3 font-semibold">Rules version</th>
                  <th className="p-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((allocation, index) => (
                  <tr
                    key={allocation.id ?? `${allocation.orderReference ?? "allocation"}-${index}`}
                    className="border-b last:border-0"
                  >
                    <td className="p-3">
                      {allocation.orderReference || "—"}
                    </td>
                    <td className="p-3">
                      {allocation.amountPaise ?? "—"}
                    </td>
                    <td className="p-3">
                      {allocation.commissionPaise ?? "—"}
                    </td>
                    <td className="p-3">
                      {allocation.currency || "—"}
                    </td>
                    <td className="p-3">
                      {allocation.rulesVersion || "—"}
                    </td>
                    <td className="p-3">
                      {allocation.createdAt &&
                      !Number.isNaN(Date.parse(allocation.createdAt))
                        ? new Date(allocation.createdAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

