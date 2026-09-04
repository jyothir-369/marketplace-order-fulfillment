"use client";

import Link from 'next/link';
import { useCartStore, selectTotalItems } from '../context/CartStore';

export default function Navbar() {
  const totalItems = useCartStore(selectTotalItems);

  return (
    <nav className="px-6 py-3 bg-white flex justify-between items-center border-b shadow-sm">
      <div className="flex items-center gap-6">
        <Link href="/products" className="font-bold text-lg text-gray-900">
          Marketplace
        </Link>
        <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
          Shop
        </Link>
        <Link href="/vendor/orders" className="text-sm text-gray-600 hover:text-gray-900">
          Vendor
        </Link>
        <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
          Admin
        </Link>
      </div>
      <Link
        href="/checkout"
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Cart ({totalItems})
      </Link>
    </nav>
  );
}
