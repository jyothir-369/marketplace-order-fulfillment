/**
 * FulfillmentDataTable â€” headless admin data table (Â§4.3).
 *
 * Powered by @tanstack/react-table v9. Supports:
 *   - column sorting
 *   - server-side pagination controls
 *   - status badges
 *   - selection (optional)
 *   - dense styling matching the operational density
 *
 * The table is presentational: data fetching, sorting state, and pagination
 * state are owned by the parent. The component dispatches `onPageChange` /
 * `onSortChange` callbacks.
 */

"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  type SortingState,
  flexRender,
  createCoreRowModel,
  createSortedRowModel,
  useTable,
  type TableFeatures,
  type RowData,
} from "@tanstack/react-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export interface FulfillmentDataTableProps<T> {
  data: T[];
  columns: FulfillmentColumnDef<T>[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSortChange?: (sort: SortingState) => void;
  loading?: boolean;
  emptyState?: ReactNode;
  /** Optional className for the table wrapper */
  className?: string;
  /** Row id accessor for selection/keying */
  getRowId?: (row: T) => string;
}

export interface FulfillmentColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  /** When set, renders the cell as a StatusBadge with this status. */
  statusKey?: keyof T;
  /** When set, marks the cell as monospaced tabular-nums. */
  mono?: boolean;
  /** Right-align the cell content. */
  align?: "left" | "right" | "center";
  /** Disable sorting for this column. */
  disableSort?: boolean;
  /** Custom CSS class for the cell. */
  className?: string;
}

const cellAlign: Record<NonNullable<FulfillmentColumnDef<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function FulfillmentDataTable<T>({
  data,
  columns,
  total,
  page,
  pageSize,
  onPageChange,
  onSortChange,
  loading = false,
  emptyState,
  className,
  getRowId,
}: FulfillmentDataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tanstackColumns = useMemo(
    () =>
      columns.map((col) => ({
        id: col.id,
        accessorKey: col.accessorKey as string | undefined,
        header: col.header,
        enableSorting: !col.disableSort,
        cell: (info: any) => {
          const row = info.row.original as T;
          if (col.statusKey) {
            const status = String(row[col.statusKey] ?? "");
            return <StatusBadge status={status} size="sm" />;
          }
          if (col.cell) {
            return col.cell(row);
          }
          const v = col.accessorKey ? row[col.accessorKey] : undefined;
          return v === null || v === undefined ? <span className="text-[var(--color-muted-foreground)]">â€”</span> : String(v);
        },
      })),
    [columns]
  );

  const table = useTable<TableFeatures, T extends RowData ? T : never>({
    data: data as T[],
    columns: tanstackColumns as any,
    state: { sorting: [] as SortingState },
    onSortingChange: (updater: any) => {
      if (!onSortChange) return;
      const next = typeof updater === "function" ? updater([]) : updater;
      onSortChange(next as SortingState);
    },
    getCoreRowModel: createCoreRowModel<TableFeatures, T extends RowData ? T : never>(),
    getSortedRowModel: createSortedRowModel<TableFeatures, T extends RowData ? T : never>(),
    getRowId: getRowId ? (row: any) => getRowId(row) : undefined,
  } as any);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        "border-[var(--color-border)] bg-[var(--color-card)] shadow-sm",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg: any) => (
              <tr
                key={hg.id}
                className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/40"
              >
                {hg.headers.map((header: any) => {
                  const colDef = columns.find((c) => c.id === header.id);
                  const align = colDef?.align ?? "left";
                  const sort = header.column.getIsSorted?.() ?? false;
                  const canSort = header.column.getCanSort?.() ?? false;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-2 text-xs font-semibold uppercase tracking-wider",
                        "text-[var(--color-muted-foreground)]",
                        cellAlign[align],
                        canSort && "cursor-pointer select-none hover:text-[var(--color-foreground)]"
                      )}
                      onClick={() => {
                        if (canSort && header.column.toggleSorting) {
                          const current = header.column.getIsSorted();
                          header.column.toggleSorting(current === "asc");
                        }
                      }}
                    >
                      <span className="flex items-center gap-1">
                        {colDef?.header ?? header.id}
                        {canSort && (
                          sort === "asc" ? (
                            <ChevronUp className="h-3 w-3" aria-hidden />
                          ) : sort === "desc" ? (
                            <ChevronDown className="h-3 w-3" aria-hidden />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden />
                          )
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`} aria-busy>
                  {columns.map((c) => (
                    <td key={c.id} className="px-4 py-3">
                      <div className="h-3 w-3/4 rounded bg-[var(--color-muted)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-[var(--color-muted-foreground)]"
                >
                  {emptyState ?? "No records found."}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row: any) => {
                const colValues = row.getAllCells();
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors",
                      "hover:bg-[var(--color-muted)]/40",
                      "data-[state=selected]:bg-[var(--color-info)]/10"
                    )}
                    data-state={row.getIsSelected?.() ? "selected" : undefined}
                  >
                    {colValues.map((cell: any) => {
                      const colDef = columns.find((c) => c.id === cell.column.id);
                      const align = colDef?.align ?? "left";
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-4 py-2 text-sm text-[var(--color-foreground)]",
                            colDef?.mono && "font-mono tabular-nums text-xs",
                            colDef?.className,
                            cellAlign[align]
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && data.length > 0 && (
        <div
          className={cn(
            "flex items-center justify-between border-t px-4 py-2.5",
            "border-[var(--color-border)] bg-[var(--color-muted)]/30"
          )}
        >
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Page <span className="font-semibold text-[var(--color-foreground)]">{page}</span> of{" "}
            <span className="font-semibold text-[var(--color-foreground)]">{totalPages}</span>
            <span className="ml-2 font-mono tabular-nums">
              ({total} total)
            </span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md",
                "border border-[var(--color-border)] bg-[var(--color-card)]",
                "hover:bg-[var(--color-accent)]",
                "disabled:opacity-40 disabled:pointer-events-none",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              )}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md",
                "border border-[var(--color-border)] bg-[var(--color-card)]",
                "hover:bg-[var(--color-accent)]",
                "disabled:opacity-40 disabled:pointer-events-none",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              )}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}