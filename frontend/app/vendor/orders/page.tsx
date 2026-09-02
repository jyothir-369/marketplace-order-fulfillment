'use client';

import { useEffect, useState } from 'react';
import {
  Order,
  OrderStatus,
  OrderTransitionAction,
  VENDOR_ID,
  getVendorOrders,
  transitionOrder,
} from '@/lib/api';
import { ToastStack, useToasts } from '@/components/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import AuditLogModal from '@/components/AuditLogModal';

interface ActionDef {
  action: OrderTransitionAction;
  label: string;
  className: string;
}

function actionsFor(status: OrderStatus): ActionDef[] {
  switch (status) {
    case 'placed':
      return [
        { action: 'CONFIRM', label: 'Confirm', className: 'bg-blue-600 text-white hover:bg-blue-700' },
        { action: 'CANCEL', label: 'Cancel', className: 'bg-red-600 text-white hover:bg-red-700' },
      ];
    case 'confirmed':
      return [
        { action: 'FULFILL', label: 'Mark as Fulfilling', className: 'bg-amber-600 text-white hover:bg-amber-700' },
        { action: 'CANCEL', label: 'Cancel', className: 'bg-red-600 text-white hover:bg-red-700' },
      ];
    case 'fulfilling':
      return [
        { action: 'SHIP', label: 'Ship Order', className: 'bg-green-600 text-white hover:bg-green-700' },
        { action: 'CANCEL', label: 'Cancel', className: 'bg-red-600 text-white hover:bg-red-700' },
      ];
    default:
      return [];
  }
}

export default function VendorOrdersPage() {
  const { toasts, push, dismiss } = useToasts();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [auditFor, setAuditFor] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await getVendorOrders(VENDOR_ID);
      setOrders(data);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performTransition = async (
    orderId: string,
    action: OrderTransitionAction,
    label: string,
  ) => {
    setActing(`${orderId}:${action}`);
    setErrorBanner(null);
    try {
      const updated = await transitionOrder(orderId, action);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      push(`${label} succeeded`, 'success');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to ${label.toLowerCase()}`;
      setErrorBanner(message);
      push(message, 'error');
      // Refresh from server in case of partial state; cheap correctness win.
      refresh();
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <button
          type="button"
          onClick={refresh}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>

      {errorBanner && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm flex items-start justify-between gap-3">
          <span>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-red-700 hover:text-red-900"
            aria-label="Dismiss error"
          >
            ?
          </button>
        </div>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Buyer</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Created</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              [1, 2, 3].map((i) => (
                <tr key={i} className="border-t">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <td key={j} className="p-3">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No orders for this vendor yet.
                </td>
              </tr>
            )}

            {!loading &&
              orders.map((order) => {
                const actions = actionsFor(order.status);
                return (
                  <tr key={order.id} className="border-t align-top hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">
                      {order.id.slice(0, 8)}
                    </td>
                    <td className="p-3 font-mono text-xs">{order.buyerId.slice(0, 8)}</td>
                    <td className="p-3 text-xs">
                      <ul className="space-y-0.5">
                        {order.lineItems
                          .filter((li) => li.vendorId === VENDOR_ID)
                          .map((li) => (
                            <li key={li.id}>
                              {li.quantity}× {li.productName}
                            </li>
                          ))}
                      </ul>
                    </td>
                    <td className="p-3">${order.totalAmount.toFixed(2)}</td>
                    <td className="p-3 text-xs text-gray-600">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setAuditFor(order.id)}
                          className="text-blue-600 text-xs hover:underline self-start"
                        >
                          View audit log
                        </button>
                        {actions.length === 0 ? (
                          <span className="text-xs text-gray-400">No actions</span>
                        ) : (
                          actions.map((a) => (
                            <button
                              key={a.action}
                              type="button"
                              disabled={acting === `${order.id}:${a.action}`}
                              onClick={() =>
                                performTransition(order.id, a.action, a.label)
                              }
                              className={`px-3 py-1 rounded text-xs disabled:opacity-50 ${a.className}`}
                            >
                              {acting === `${order.id}:${a.action}` ? '…' : a.label}
                            </button>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <AuditLogModal orderId={auditFor} onClose={() => setAuditFor(null)} />
    </div>
  );
}
