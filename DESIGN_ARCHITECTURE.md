# Design Architecture

> **Audience**: Frontend engineers, designers, and code reviewers extending the marketplace-order-fulfillment monorepo. This document is the single source of truth for visual language, component contracts, and the phased rollout plan that prepares the storefront and operational portal for multi-feature expansion.

---

## 1. Executive Architectural Vision

### 1.1 Design Philosophy

The application serves two audiences with opposing ergonomics:

| Audience | Goal | Design Tenet |
| --- | --- | --- |
| Buyers (storefront) | Discover products, transact fast, build trust | Calm, spacious, conversion-optimized |
| Operators (admin/vendor) | Triage incidents, drive fulfillment, audit fast | Dense, scannable, telemetry-forward |

Both surfaces share one design-token substrate but project it through two distinct themes:

1. **storefront** - light-mode-first, glassmorphic hero surfaces, soft shadows, generous whitespace, large tap targets, motion-driven feedback (cart drawer, quick-view modal).
2. **operational** - light/dark parity, fixed-density tables, monospace numerics, status-driven colour (the existing lib/status-tokens.ts vocabulary), keyboard-first navigation.

A single globals.css emits the token set; a data-density attribute (comfortable vs. compact) on body or per-layout flips between grammars.

### 1.2 Token Layout (dual-theme)

`
:root                       - Light mode (default)
[data-theme=dark]           - Dark mode
[data-surface=storefront]   - Comfort density overlay
[data-surface=operational]  - Compact density overlay
`

### 1.3 Component Composition Model

All UI primitives follow this three-layer stack:

`
+---------------------------------------------+
|  Domain Components (e.g. CartDrawerItem)    | - business logic + tokens
+---------------------------------------------+
|  Composite Primitives (Dialog, DataTable)   | - Radix-backed, headless
+---------------------------------------------+
|  Atoms (Button, Badge, Skeleton, Toast)     | - tokens only, zero logic
+---------------------------------------------+
`

---

## 2. Technology Stack

### 2.1 Core Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | RSC, route groups, parallel/intercepting routes |
| Language | TypeScript 5 (strict) | Type-safety across DTO <-> UI boundary |
| Styling | Tailwind CSS v4 (@theme) | CSS-first config, no tailwind.config.ts |
| State (client) | Zustand 5 | Tiny store for cart, filters; no provider tree |
| Server cache | TanStack Query 5 | Polling for order/sync-job status; retry semantics |
| Validation | Zod 3 | Mirrors NestJS DTOs; shared between server actions |

### 2.2 UI Primitives

| Need | Library | Notes |
| --- | --- | --- |
| Headless dialog/menu/popover | Radix UI Primitives | a11y-correct, unstyled |
| Tables | @tanstack/react-table 8 | Headless; we own styling |
| Icons | lucide-react | Already in deps; tree-shakeable |
| Forms | react-hook-form 7 + Zod | Controlled, low-rerender |
| Charts | Recharts 2 | SVG-based; dashboard telemetry cards |
| Animations | framer-motion 11 | Cart drawer, modal, toast physics |
| Toasts | Existing ToastProvider | Already fits the design system |
| Class merging | clsx + tailwind-merge | Implemented in lib/utils.ts cn() |
| Date formatting | date-fns 3 | Tree-shakeable vs. moment |
| Skeletons | Hand-rolled + Skeleton atom | Avoid heavy react-content-loader |

> **Note**: We deliberately avoid Material UI / Chakra. Both ship their own theming engines that fight Tailwind v4. Radix + Tailwind tokens keeps the boundary clean.

### 2.3 Backend Hand-off

| Concern | Source of truth | Mirror in frontend |
| --- | --- | --- |
| Status vocabulary | src/common/.../entity.enums | frontend/lib/status-tokens.ts |
| DTOs | src/**/*.dto.ts | frontend/lib/types.ts |
| Validation rules | class-validator decorators | Zod schemas (when server actions ship) |
| Audit log shape | AuditLog entity | AdminAuditLogDto mirror |

---

## 3. Component & Page Blueprint

### 3.1 Storefront (app/(storefront)/...)

Density profile: comfortable, light-default.

| Path | Components Required |
| --- | --- |
| / (redirect to /products) | handled by app/page.tsx |
| /products | StorefrontHeader, CatalogGrid, CatalogFilters, Pagination |
| /products/[id] | ProductDetail, QuickAddToCart, RelatedProducts |
| /checkout | CartDrawer (modal), CheckoutForm, OrderSummary |
| /orders/[id] | OrderTracker (polling), LineItemTimeline |



#### 3.1.1 StorefrontHeader - already shipped

Sticky top bar; cart badge hydrated via useCartHydration() to avoid SSR mismatch (GAP-F10).

#### 3.1.2 CatalogGrid (new)

```tsx
// frontend/components/storefront/CatalogGrid.tsx
import { ProductCard } from './ProductCard';
import { CatalogGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PackageSearch } from 'lucide-react';

interface CatalogGridProps {
  products: ProductDto[];
  loading?: boolean;
}

export function CatalogGrid({ products, loading }: CatalogGridProps) {
  if (loading) return <CatalogGridSkeleton count={8} />;
  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageSearch size={48} aria-hidden />}
        title="No products match your filters"
        description="Try removing a filter or check back soon."
      />
    );
  }
  return (
    <ul
      role="list"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    >
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
```

#### 3.1.3 ProductCard (new)

Glassmorphic surface (subtle backdrop-blur), hover lift, price + stock badge, Quick view trigger.

```tsx
// frontend/components/storefront/ProductCard.tsx
import Link from 'next/link';
import { PackageSearch } from 'lucide-react';
import { ProductDto } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';

export function ProductCard({ product }: { product: ProductDto }) {
  const oos = product.stockCount <= 0;
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl',
        'border border-zinc-200/70 bg-white/70 backdrop-blur-md',
        'shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
      )}
    >
      <Link
        href={"/products/" + product.id}
        aria-label={"View " + product.name}
        className="absolute inset-0 z-10"
      />
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-indigo-50 to-rose-50">
        <div className="absolute inset-0 grid place-items-center text-zinc-400">
          <PackageSearch size={56} aria-hidden />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <header className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2">
            {product.name}
          </h3>
          <span className="text-base font-bold text-indigo-600">
            {formatCurrency(product.price)}
          </span>
        </header>
        <p className="text-xs text-zinc-500">{product.vendorName}</p>
        <footer className="mt-auto pt-3">
          <StatusBadge
            status={oos ? 'FAILED' : 'PENDING'}
            label={oos ? 'Out of stock' : (product.stockCount + ' in stock')}
            size="sm"
          />
        </footer>
      </div>
    </article>
  );
}
```


#### 3.1.4 CartDrawer (new)

Right-edge sheet powered by Radix Dialog. Open/close wired to Zustand useCartStore.

```tsx
// frontend/components/storefront/CartDrawer.tsx
"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCartStore } from "@/context/CartStore";
import { CartDrawerItem } from "./CartDrawerItem";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export function CartDrawer() {
  const open = useCartStore((s) => s.drawerOpen);
  const close = useCartStore((s) => s.closeDrawer);
  const items = useCartStore((s) => s.items);
  const total = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? null : close())}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="fixed right-0 top-0 z-50 h-full w-full max-w-md flex flex-col bg-white shadow-2xl border-l border-zinc-200"
              >
                <header className="flex items-center justify-between border-b px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold">
                    Your cart
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      aria-label="Close cart"
                      className="rounded p-1 hover:bg-zinc-100"
                    >
                      <X size={20} aria-hidden />
                    </button>
                  </Dialog.Close>
                </header>
                <ul role="list" className="flex-1 overflow-y-auto px-6 py-4">
                  {items.length === 0 ? (
                    <li className="grid place-items-center py-12 text-sm text-zinc-500">
                      Your cart is empty.
                    </li>
                  ) : (
                    items.map((i) => <CartDrawerItem key={i.productId} item={i} />)
                  )}
                </ul>
                <footer className="border-t px-6 py-4">
                  <div className="mb-4 flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <Button asChild className="w-full">
                    <a href="/checkout">Checkout</a>
                  </Button>
                </footer>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
```

#### 3.1.5 QuickViewModal (new)

Triggered from ProductCard Quick view button. Uses Radix Dialog with framer-motion scale entrance.

---

### 3.2 Operational Portal (app/(operational)/...)

Density profile: compact, optional dark mode.

| Path | Components Required |
| --- | --- |
| /admin | TelemetryCard x 6, ReconciliationSparkline |
| /admin/orders | OrderFilters, FulfillmentDataTable, Pagination |
| /admin/orders/[id] | OrderDetailDrawer, LineItemTimeline |
| /admin/dead-letter | DeadLetterInspector (DLQ list + retry) |
| /admin/audit-logs | AuditLogTimeline (correlation-id trace) |
| /vendor/inventory | InventoryTable (with stock badges) |
| /vendor/orders | VendorOrdersTable |
| /vendor/dead-letter | DeadLetterInspector (vendor-scoped) |

#### 3.2.1 TelemetryCard (new)

```tsx
// frontend/components/operational/TelemetryCard.tsx
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TelemetryCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
}

const TONE_RING: Record<NonNullable<TelemetryCardProps["tone"]>, string> = {
  default: "ring-zinc-200",
  warning: "ring-amber-300",
  danger:  "ring-rose-300",
  success: "ring-emerald-300",
};

export function TelemetryCard({ label, value, delta, icon: Icon, tone = "default" }: TelemetryCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 ring-1 transition-shadow hover:shadow-md",
        TONE_RING[tone],
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon size={16} aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-zinc-900">
        {value}
      </p>
      {delta !== undefined && (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs font-medium",
            positive ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {positive ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
          {positive ? "+" : ""}{delta}%
        </p>
      )}
    </div>
  );
}
```

#### 3.2.2 FulfillmentDataTable (new)

Headless table powered by @tanstack/react-table; column toggling, server-side sort, pagination.

```tsx
// frontend/components/operational/FulfillmentDataTable.tsx
"use client";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminOrderDto } from "@/lib/types";

const columns: ColumnDef<AdminOrderDto>[] = [
  {
    accessorKey: "orderNumber",
    header: ({ column }) => (
      <button
        type="button"
        onClick={() => column.toggleSorting()}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600"
      >
        Order
        <ArrowUpDown size={12} aria-hidden />
      </button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm text-zinc-900">
        {row.original.orderNumber ?? row.original.orderId.slice(0, 8)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
  },
  {
    accessorKey: "buyerId",
    header: "Buyer",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-zinc-600">
        {row.original.buyerId.slice(0, 8)}...
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <time className="text-xs text-zinc-600">
        {new Date(row.original.createdAt).toLocaleString()}
      </time>
    ),
  },
];

export function FulfillmentDataTable({ data }: { data: AdminOrderDto[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} className="px-4 py-2 text-left">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn("hover:bg-indigo-50/40", row.getIsSelected() && "bg-indigo-50")}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t bg-zinc-50 px-4 py-2 text-xs">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded border px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 3.2.3 DeadLetterInspector (new)

List view of DeadLetterJobDto with retry button. Inline correlation-id copier + ResolveLineItemDialog for manual intervention.

```tsx
// frontend/components/operational/DeadLetterInspector.tsx
"use client";
import { RefreshCw, AlertOctagon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { retryDeadLetterJob } from "@/lib/api";
import type { DeadLetterJobDto } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";

export function DeadLetterInspector({ jobs }: { jobs: DeadLetterJobDto[] }) {
  const qc = useQueryClient();
  const retry = useMutation({
    mutationFn: retryDeadLetterJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dead-letter"] }),
  });

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<AlertOctagon size={48} aria-hidden />}
        title="No dead-letter jobs"
        description="All vendor sync jobs are within retry budget."
      />
    );
  }

  return (
    <ul role="list" className="divide-y divide-zinc-200 rounded-lg border bg-white">
      {jobs.map((j) => (
        <li key={j.id} className="flex items-center gap-4 px-4 py-3">
          <StatusBadge status={j.status} size="sm" />
          <div className="flex-1">
            <p className="font-mono text-xs text-zinc-700">
              {j.id.slice(0, 8)}... - line {j.orderLineItemId.slice(0, 8)}...
            </p>
            <p className="text-xs text-zinc-500">
              attempts {j.attempts}/{j.maxAttempts} - last tried {formatRelativeTime(j.lastAttemptedAt)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => retry.mutate(j.id)}
            disabled={retry.isPending}
          >
            <RefreshCw size={14} className="mr-1" aria-hidden /> Retry
          </Button>
        </li>
      ))}
    </ul>
  );
}
```

#### 3.2.4 AuditLogTimeline (new)

Vertical timeline grouping logs by correlation-id. Already a server-side endpoint (/api/admin/audit-logs and /api/admin/trace/:correlationId).

```tsx
// frontend/components/operational/AuditLogTimeline.tsx
import { formatRelativeTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdminAuditLogDto } from "@/lib/types";

export function AuditLogTimeline({ logs }: { logs: AdminAuditLogDto[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-zinc-500">No audit events yet.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-zinc-200 pl-6">
      {logs.map((log) => (
        <li key={log.id} className="relative">
          <span className="absolute -left-[27px] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-indigo-500 ring-4 ring-white" />
          <div className="flex items-center gap-2">
            <StatusBadge status={log.action} size="sm" />
            <time className="text-xs text-zinc-500">{formatRelativeTime(log.createdAt)}</time>
          </div>
          <p className="mt-1 text-sm text-zinc-800">{log.message}</p>
          {log.metadata && (
            <pre className="mt-1 overflow-x-auto rounded bg-zinc-50 p-2 text-xs text-zinc-600">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </li>
      ))}
    </ol>
  );
}
```


---

## 4. Design Tokens (globals.css Specifications)

The repository already ships a token block in frontend/app/globals.css. This section **expands** that contract to cover both surfaces and dark mode for the operational portal.

```css
/* frontend/app/globals.css */
@import "tailwindcss";

/* ============================================================================
 * THEME TOKENS - HSL channels only, resolved via Tailwind v4 @theme.
 * Components consume bg-(--color-surface), text-(--color-foreground), etc.
 * ========================================================================== */

@theme {
  --color-background:             hsl(0 0% 100%);
  --color-foreground:             hsl(240 10% 3.9%);
  --color-card:                   hsl(0 0% 100%);
  --color-card-foreground:        hsl(240 10% 3.9%);
  --color-popover:                hsl(0 0% 100%);
  --color-popover-foreground:     hsl(240 10% 3.9%);
  --color-primary:                hsl(238 84% 67%);
  --color-primary-foreground:     hsl(0 0% 100%);
  --color-secondary:              hsl(240 4.8% 95.9%);
  --color-secondary-foreground:   hsl(240 5.9% 10%);
  --color-muted:                  hsl(240 4.8% 95.9%);
  --color-muted-foreground:       hsl(240 3.8% 46.1%);
  --color-accent:                 hsl(240 4.8% 95.9%);
  --color-accent-foreground:      hsl(240 5.9% 10%);
  --color-destructive:            hsl(0 84.2% 60.2%);
  --color-destructive-foreground: hsl(0 0% 98%);
  --color-border:                 hsl(240 5.9% 90%);
  --color-input:                  hsl(240 5.9% 90%);
  --color-ring:                   hsl(238 84% 67%);

  /* Status palette (matches lib/status-tokens.ts) */
  --color-status-placed:        hsl(199 89% 48%);
  --color-status-confirmed:     hsl(217 91% 60%);
  --color-status-fulfilling:    hsl(38 92% 50%);
  --color-status-fulfilled:     hsl(160 84% 39%);
  --color-status-cancelled:     hsl(240 4% 46%);
  --color-status-failed:        hsl(346 77% 50%);
  --color-status-dead-letter:   hsl(0 73% 42%);
  --color-status-ambiguous:     hsl(48 96% 53%);

  /* Surface aliases */
  --color-surface-base:         var(--color-background);
  --color-surface-elevated:     var(--color-card);
  --color-surface-hover:        hsl(240 4.8% 95.9% / 0.5);

  /* Radius scale */
  --radius-sm: 0.375rem;
  --radius:    0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Motion */
  --ease-out-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
}

/* ============================================================================
 * DARK MODE - operational portal only.
 * Triggered by data-theme=dark on html or prefers-color-scheme: dark.
 * ========================================================================== */
@layer base {
  :root[data-theme=dark] {
    --color-background:             hsl(240 10% 3.9%);
    --color-foreground:             hsl(0 0% 98%);
    --color-card:                   hsl(240 6% 10%);
    --color-card-foreground:        hsl(0 0% 98%);
    --color-popover:                hsl(240 6% 10%);
    --color-popover-foreground:     hsl(0 0% 98%);
    --color-primary:                hsl(238 84% 67%);
    --color-primary-foreground:     hsl(0 0% 100%);
    --color-secondary:              hsl(240 3.7% 15.9%);
    --color-secondary-foreground:   hsl(0 0% 98%);
    --color-muted:                  hsl(240 3.7% 15.9%);
    --color-muted-foreground:       hsl(240 5% 64.9%);
    --color-accent:                 hsl(240 3.7% 15.9%);
    --color-accent-foreground:      hsl(0 0% 98%);
    --color-destructive:            hsl(0 62.8% 30.6%);
    --color-destructive-foreground: hsl(0 0% 98%);
    --color-border:                 hsl(240 3.7% 15.9%);
    --color-input:                  hsl(240 3.7% 15.9%);
    --color-ring:                   hsl(240 4.9% 83.9%);
    --color-surface-hover:          hsl(240 3.7% 15.9% / 0.5);
  }

  :root[data-surface=operational] {
    color-scheme: light dark;
  }

  * { border-color: var(--color-border); }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }
}

/* ============================================================================
 * DENSITY TOKENS - comfortable (storefront) vs. compact (operational).
 * ========================================================================== */
@layer utilities {
  [data-density=compact] {
    --density-row-h: 2.25rem;
    --density-font:  0.8125rem;
  }
  [data-density=comfortable] {
    --density-row-h: 3rem;
    --density-font:  0.9375rem;
  }
}

/* ============================================================================
 * STOREFRONT HERO - gradient backdrop for product cards and hero section.
 * ========================================================================== */
@layer utilities {
  .bg-hero-gradient {
    background-image:
      radial-gradient(at 20% 20%, hsl(238 84% 90%) 0, transparent 50%),
      radial-gradient(at 80% 0%,  hsl(330 81% 92%) 0, transparent 50%),
      radial-gradient(at 80% 100%, hsl(48 96% 90%) 0, transparent 50%);
  }

  .glass-panel {
    border: 1px solid hsl(240 5.9% 90% / 0.7);
    background-color: hsl(0 0% 100% / 0.7);
    backdrop-filter: blur(12px);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }
}

/* ============================================================================
 * PULSE DOT - used by status badges for live states.
 * ========================================================================== */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
.animate-pulse { animation: pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
```

> **Why this layout works for both surfaces**:
> - Storefront reads `--color-primary` as `indigo-500ish`, achieving a consumer-grade feel without dropping back to Tailwind's default zinc.
> - Operational reads the same tokens but composes them onto a darker `--color-card` for a dense dashboard look.
> - Status palette matches `lib/status-tokens.ts` so colour is consistent across SSR markup and rehydrated client renders.

---


## 5. Phase-by-Phase Implementation Roadmap

### Phase 0 - Foundations (this PR)

- Document the architecture in DESIGN_ARCHITECTURE.md (this file).
- Confirm lib/utils.ts exposes cn(), formatRelativeTime(), formatCurrency().
- Verify globals.css token block compiles under Tailwind v4.

### Phase 1 - Core UI Primitives (1-2 days)

1. Install dependencies:
   ```bash
   cd frontend
   npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
               @radix-ui/react-tooltip @radix-ui/react-select \
               @radix-ui/react-popover @radix-ui/react-tabs \
               @tanstack/react-table@^8 framer-motion@^11 \
               recharts@^2 react-hook-form@^7 zod@^3 @hookform/resolvers@^3 \
               date-fns@^3 clsx tailwind-merge
   ```
2. Add Button, Input, Select, Dialog, Tooltip, Tabs, DropdownMenu primitives to frontend/components/ui/. Each is a thin Radix wrapper that consumes cn() and the tokens above.
3. Add a ThemeProvider that toggles data-theme on html and persists the choice to localStorage.
4. Wire ToastProvider at the root layout level (replaces the layout-local one for symmetry).

### Phase 2 - Storefront Overhaul (2-3 days)

1. Build CatalogGrid, ProductCard, ProductDetail, QuickViewModal.
2. Build CartDrawer and integrate with useCartStore.
3. Replace StorefrontHeader static cart badge with a Sheet-style trigger that opens CartDrawer.
4. Build /checkout page with CheckoutForm (RHF + Zod mirroring CheckoutDto).
5. Visual QA: confirm /products grid renders correctly at sm/md/lg/xl breakpoints; cart drawer spring animation feels right at 60fps.

### Phase 3 - Operational Dashboard (3-4 days)

1. Build TelemetryCard and the /admin dashboard with six cards fed by /api/admin/dashboard. Add a ReconciliationSparkline (Recharts) on the side.
2. Build FulfillmentDataTable on /admin/orders with server-side pagination + filtering.
3. Build DeadLetterInspector on both /admin/dead-letter and /vendor/dead-letter.
4. Build AuditLogTimeline on /admin/audit-logs (correlation-id grouping).
5. Build ResolveLineItemDialog modal for manual intervention.
6. Wire TanStack Query providers in lib/query-client.ts; ensure useOrderPolling continues to work alongside React Query.

### Phase 4 - Polish and A11y (1-2 days)

1. Verify focus rings (focus-visible:ring-2 ring-(--color-ring)) on every interactive element.
2. Run axe-core against /products, /admin, /admin/dead-letter.
3. Verify reduced-motion media query disables drawer spring animation.
4. Add aria-live regions to ToastViewport and CartDrawer.

---

## 6. Verification and QA Checklist

### 6.1 Static Quality

- [ ] cd frontend \&\& npx tsc --noEmit exits with 0 errors and 0 warnings.
- [ ] npm run lint (ESLint, Next.js config) exits clean.
- [ ] globals.css compiles under Tailwind v4 with no @apply on non-token utilities.
- [ ] No raw hex colours in any .tsx file - colours must reference Tailwind tokens or var(--color-*).

### 6.2 Route Isolation

- [ ] Visiting /products does NOT mount OperationalSidebar.
- [ ] Visiting /admin does NOT mount StorefrontHeader or CartDrawer.
- [ ] Server-rendered HTML for / is a redirect to /products and contains no StorefrontHeader markup.
- [ ] Each route groups error.tsx renders only the localised fallback, not the root one.

### 6.3 Performance Budgets

| Metric | Budget |
| --- | --- |
| First Contentful Paint (/products) | < 1.2 s on 4G |
| Time-to-Interactive (/checkout) | < 2.0 s on 4G |
| Cart drawer open animation | 60 fps, < 300 ms total |
| Data table render (1k rows) | < 100 ms (virtualised when > 100) |
| JS bundle (initial, gzipped) | < 180 KB |
| LCP image on /products/[id] | < 2.5 s using next/image |

### 6.4 Type-Safety Gates

- [ ] frontend/lib/types.ts matches every field of every backend DTO exposed via lib/api.ts. Drift caught by future scripts/sync-types.ts job.
- [ ] status-tokens.ts keys match every OrderStatus, FulfillmentStatus, and SyncJobStatus enum value from the backend.
- [ ] No any introduced in newly added components. unknown + narrowing required for defensive parsing.

### 6.5 Accessibility

- [ ] All buttons/links have discernible text or aria-label.
- [ ] All form inputs have associated label elements.
- [ ] Modals trap focus; ESC closes; focus returns to trigger on close.
- [ ] Status badges have role=status and aria-label matching the tokens label field.
- [ ] Reduced-motion users get instant (no-animation) transitions.

### 6.6 Observability

- [ ] Every mutation emits a UI toast (success | error).
- [ ] Failed fetches surface the message field from ApiErrorBody.message (string | string[]).
- [ ] Admin audit timeline renders metadata as collapsible JSON for post-mortem.

---

## 7. Open Questions / Future Work

1. **Storybook**: introduce Storybook 8 once primitives land so reviewers can exercise variants without spinning up the full app.
2. **Image pipeline**: placeholder heroes today; wire next/image once the product media bucket exists.
3. **Real-time updates**: BullMQ progress already reaches the buyer via polling; long-term, evaluate SSE or WebSocket push for sub-second updates.
4. **i18n**: English only today. Adopt next-intl before shipping to second market.
5. **Theme persistence**: localStorage for now; consider cookies() + RSC for SSR-correct initial render.

---

*End of document.*

