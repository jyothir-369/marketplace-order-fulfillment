'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getOrderById, Order } from '../../../lib/api';

export default function OrderStatusPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (id) {
      const fetchOrder = async () => {
        const data = await getOrderById(id);
        setOrder(data);
      };
      fetchOrder();
      const interval = setInterval(fetchOrder, 5000);
      return () => clearInterval(interval);
    }
  }, [id]);

  if (!order) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Order Status</h1>
      <p>Order ID: {order.id}</p>
      <p className="text-xl font-semibold mt-2">Status: {order.status}</p>
    </div>
  );
}
