import { useEffect, useState } from "react";
import { getOrdersForBuyer } from "@/lib/api";
export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { getOrdersForBuyer().then(setOrders).catch((e) => setErr(e.message)); }, []);
  if (err) return <div role="alert">{err}</div>;
  if (!orders.length) return <div>No orders found.</div>;
  return (
    <main>
      <h1>Order History (real /api/orders/me)</h1>
      {orders.map((o) => (
        <section key={o.id}><h2>Order {o.orderNumber || o.id}</h2><p>Status: {o.status}</p></section>
      ))}
    </main>
  );
}
