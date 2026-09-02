import Link from 'next/link';
import { useCartStore } from '../context/CartStore';

export default function Navbar() {
  const totalItems = useCartStore((state) => state.totalItems);

  return (
    <nav className="p-4 bg-gray-100 flex justify-between items-center border-b">
      <Link href="/products" className="font-bold text-xl">Marketplace</Link>
      <Link href="/checkout" className="bg-blue-600 text-white px-4 py-2 rounded">
        Cart ({totalItems})
      </Link>
    </nav>
  );
}
