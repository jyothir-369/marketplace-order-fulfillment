import type { OrderStatus } from '@/lib/api';

const styles: Record<OrderStatus, string> = {
  placed: 'bg-gray-200 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  fulfilling: 'bg-amber-100 text-amber-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}
