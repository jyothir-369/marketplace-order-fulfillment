'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '../../context/CartStore';
import { createOrder } from '../../lib/api';

export default function CheckoutPage() {
  const { cart, totalAmount, clearCart, updateQuantity, removeFromCart } = useCartStore();
  const [address, setAddress] = useState('');
  const router = useRouter();

  if (cart.length === 0) return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
      <Link href="/products" className="text-blue-500">Back to Products</Link>
    </div>
  );

  const handleCheckout = async () => {
    try {
      const order = await createOrder({
        buyerId: 'buyer-1',
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: address,
      });
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (error) {
      alert('Checkout failed');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <ul>
        {cart.map((item) => (
          <li key={item.productId} className="flex justify-between mb-2">
            {item.name} - {item.quantity} x ${item.price}
            <div>
              <input 
                type="number" 
                min="1"
                max={item.maxStock}
                value={item.quantity}
                onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value))}
                className="w-16 border mr-2"
              />
              <button onClick={() => removeFromCart(item.productId)} className="text-red-500">Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <p className="font-bold mt-4">Total: ${totalAmount}</p>
      <input
        className="border p-2 mt-4 w-full"
        placeholder="Shipping Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <button
        onClick={handleCheckout}
        className="bg-green-500 text-white px-4 py-2 mt-4 rounded"
      >
        Place Order
      </button>
    </div>
  );
}
