"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Package,
  X,
} from "lucide-react";

import {
  getVendorProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api";
import type { CreateProductDto, ProductDto } from "@/lib/types";
import { useVendorId } from "@/lib/hooks/use-vendor-id";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type ProductFormValues = {
  name: string;
  category: string;
  price: string;
  stockCount: string;
};

const EMPTY_FORM: ProductFormValues = {
  name: "",
  category: "",
  price: "",
  stockCount: "0",
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred. Please try again.";
}

function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "statusCode" in error) {
    return Number((error as { statusCode?: number }).statusCode);
  }
  return undefined;
}

export default function VendorProductsPage() {
  const vendorId = useVendorId();
  const { push: toast } = useToast();

  const [items, setItems] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editor, setEditor] = useState<{ product: ProductDto | null } | null>(null);
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vendorId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const products = await getVendorProducts(vendorId, true);
      setItems(products);
    } catch (error: unknown) {
      // Never silently disguise a failed request as an empty catalogue.
      setItems([]);
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateForm() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditor({ product: null });
  }

  function openEditForm(product: ProductDto) {
    setForm({
      name: product.name,
      category: product.category ?? "",
      price: String(product.price),
      stockCount: String(product.stockCount),
    });
    setFormError(null);
    setEditor({ product });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editor || saving) return;

    if (!vendorId) {
      setFormError("This account is not linked to a vendor.");
      return;
    }

    const name = form.name.trim();
    const price = Number(form.price);
    const stockCount = Number(form.stockCount);
    const category = form.category.trim();

    if (!name) {
      setFormError("Product name is required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid non-negative price.");
      return;
    }

    if (!Number.isInteger(stockCount) || stockCount < 0) {
      setFormError("Stock must be a non-negative whole number.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editor.product) {
        await updateProduct(editor.product.id, {
          name,
          category: category || undefined,
          price,
          stockCount,
        });

        toast("Product updated successfully.", "success");
      } else {
        const payload: CreateProductDto = {
          vendorId,
          name,
          price,
          stockCount,
          ...(category ? { category } : {}),
        };

        await createProduct(payload);
        toast("Product created successfully.", "success");
      }

      setEditor(null);
      await load();
    } catch (error: unknown) {
      const status = errorStatus(error);

      if (status === 409) {
        setFormError(
          "This product was changed elsewhere. Refresh the list and reopen it before trying again."
        );
        toast("Product has changed. Refresh and try again.", "warning");
      } else {
        setFormError(errorMessage(error));
        toast(errorMessage(error), "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAvailabilityToggle(product: ProductDto) {
    if (busyProductId || !vendorId) return;

    if (
      product.isActive &&
      !window.confirm(
        `Deactivate "${product.name}"? It will no longer appear in the public catalogue. Existing order history will be preserved.`
      )
    ) {
      return;
    }

    setBusyProductId(product.id);

    try {
      if (product.isActive) {
        await deleteProduct(product.id);
        toast("Product deactivated.", "success");
      } else {
        await updateProduct(product.id, { isActive: true });
        toast("Product reactivated.", "success");
      }

      await load();
    } catch (error: unknown) {
      toast(errorMessage(error), "error");
    } finally {
      setBusyProductId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading products">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!vendorId) {
    return (
      <section className="space-y-3" role="alert">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <p className="text-sm text-[var(--color-warm-muted)]">
          This account is not linked to a vendor. Ask an administrator to
          complete the vendor-account setup before managing products.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">
            Products
          </h1>
          <p className="mt-1 text-sm text-[var(--color-warm-muted)]">
            Create products, update pricing and stock, or remove items from the
            public catalogue.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || saving || Boolean(busyProductId)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--color-card)] disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={saving || Boolean(busyProductId)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create product
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--color-destructive)]/40 p-4 text-sm"
        >
          <p className="font-semibold">Could not load products</p>
          <p className="mt-1">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {editor && (
        <section
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-v2"
          aria-labelledby="product-editor-title"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 id="product-editor-title" className="text-lg font-bold">
                {editor.product ? "Edit product" : "Create product"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-warm-muted)]">
                Prices are entered in the store's currency. Stock must be a
                whole number.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditor(null);
                setFormError(null);
              }}
              disabled={saving}
              aria-label="Close product form"
              className="rounded-lg p-2 hover:bg-[var(--color-cream)] disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="product-name" className="mb-1 block text-sm font-semibold">
                  Product name
                </label>
                <input
                  id="product-name"
                  required
                  maxLength={255}
                  value={form.name}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="product-category" className="mb-1 block text-sm font-semibold">
                  Category
                </label>
                <input
                  id="product-category"
                  maxLength={120}
                  value={form.category}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, category: event.target.value }))
                  }
                  disabled={saving}
                  placeholder="e.g. Accessories"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="product-price" className="mb-1 block text-sm font-semibold">
                  Unit price
                </label>
                <input
                  id="product-price"
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, price: event.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="product-stock" className="mb-1 block text-sm font-semibold">
                  Stock quantity
                </label>
                <input
                  id="product-stock"
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={form.stockCount}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, stockCount: event.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            {formError && (
              <p role="alert" className="rounded-lg bg-[var(--color-destructive)]/10 p-3 text-sm">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editor.product
                    ? "Save changes"
                    : "Create product"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditor(null);
                  setFormError(null);
                }}
                disabled={saving}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {!loadError && items.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10 text-[var(--color-brass)]" />}
          title="No products yet"
          description="Create your first product to start selling."
          action={
            <button
              type="button"
              onClick={openCreateForm}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              Create first product
            </button>
          }
        />
      ) : !loadError ? (
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-v2">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-[var(--color-ink-navy)] text-left text-xs uppercase tracking-wider text-white">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3 text-right">Unit price</th>
                <th scope="col" className="px-4 py-3 text-right">Stock</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => {
                const busy = busyProductId === product.id;

                return (
                  <tr
                    key={product.id}
                    className="border-t border-[var(--color-border)] hover:bg-[var(--color-cream)]/40"
                  >
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-[var(--color-warm-muted)]">
                      {product.category || "Uncategorized"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ${Number(product.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {product.stockCount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          product.isActive
                            ? "rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"
                            : "rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700"
                        }
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(product)}
                          disabled={saving || Boolean(busyProductId)}
                          aria-label={`Edit ${product.name}`}
                          className="rounded-md border border-[var(--color-border)] p-2 hover:bg-[var(--color-cream)] disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleAvailabilityToggle(product)}
                          disabled={saving || Boolean(busyProductId)}
                          aria-label={product.isActive
                            ? `Deactivate ${product.name}`
                            : `Reactivate ${product.name}`}
                          className="rounded-md border border-[var(--color-border)] p-2 hover:bg-[var(--color-cream)] disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          <span className="sr-only">
                            {product.isActive ? "Deactivate" : "Reactivate"}
                          </span>
                        </button>
                        {busy && <span className="sr-only">Updating product...</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}