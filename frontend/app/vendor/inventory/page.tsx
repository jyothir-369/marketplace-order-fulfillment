'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Product,
  getVendorProducts,
  updateStock,
  createProduct,
  VENDOR_ID,
} from '@/lib/api';
import { ToastStack, useToasts } from '@/components/Toast';

interface NewProductForm {
  name: string;
  price: number;
  stockCount: number;
}

const emptyForm: NewProductForm = { name: '', price: 0, stockCount: 0 };

export default function InventoryPage() {
  const { toasts, push, dismiss } = useToasts();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NewProductForm>(emptyForm);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    try {
      const data = await getVendorProducts(VENDOR_ID, true);
      setProducts(data);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveStock = async (productId: string) => {
    const next = editing[productId];
    if (next === undefined || Number.isNaN(next) || next < 0) {
      push('Stock must be a non-negative number', 'error');
      return;
    }
    setSavingId(productId);
    try {
      const updated = await updateStock(productId, next);
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      setEditing((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      push(`Stock updated for ${updated.name}`, 'success');
    } catch (err) {
      push(err instanceof Error ? err.message : 'Failed to update stock', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      push('Name is required', 'error');
      return;
    }
    if (form.price < 0 || form.stockCount < 0) {
      push('Price and stock must be non-negative', 'error');
      return;
    }
    setCreating(true);
    try {
      const created = await createProduct({
        vendorId: VENDOR_ID,
        name: form.name.trim(),
        price: form.price,
        stockCount: form.stockCount,
      });
      setProducts((prev) => [created, ...prev]);
      setForm(emptyForm);
      setModalOpen(false);
      push(`Created ${created.name}`, 'success');
    } catch (err) {
      push(err instanceof Error ? err.message : 'Failed to create product', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Product
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Title</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Price</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">Stock</th>
              <th className="p-3 w-px whitespace-nowrap" />
            </tr>
          </thead>
          <tbody>
            {loading &&
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="border-t">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <td key={j} className="p-3">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No products yet. Add one to get started.
                </td>
              </tr>
            )}

            {!loading &&
              products.map((p) => {
                const draft = editing[p.id];
                return (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs text-gray-500">
                      {p.id.slice(0, 8)}
                    </td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 font-mono text-xs">
                      PROD-{p.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="p-3">${p.price.toFixed(2)}</td>
                    <td className="p-3">{p.vendorName}</td>
                    <td className="p-3">
                      {draft !== undefined ? (
                        <input
                          type="number"
                          min={0}
                          value={draft}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [p.id]: Number(e.target.value),
                            }))
                          }
                          className="w-20 border rounded px-2 py-1"
                        />
                      ) : (
                        <span
                          className={
                            p.stockCount === 0 ? 'text-red-600 font-semibold' : ''
                          }
                        >
                          {p.stockCount}
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {draft !== undefined ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={savingId === p.id}
                            onClick={() => saveStock(p.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                          >
                            {savingId === p.id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditing((prev) => {
                                const copy = { ...prev };
                                delete copy[p.id];
                                return copy;
                              })
                            }
                            className="text-gray-500 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing((prev) => ({ ...prev, [p.id]: p.stockCount }))
                          }
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={submitNew}
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">New Product</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Price (USD)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Stock</label>
                <input
                  type="number"
                  min={0}
                  value={form.stockCount}
                  onChange={(e) =>
                    setForm({ ...form, stockCount: Number(e.target.value) })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
