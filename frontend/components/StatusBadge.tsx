import type { OrderStatus } from '@/lib/api';

const styles: Record<OrderStatus, string> = {
  PLACED: 'bg-gray-200 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  FULFILLING: 'bg-amber-100 text-amber-800',
  FULFILLED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}