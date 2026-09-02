'use client';
import { useEffect, useState } from 'react';
import { getProducts, Product } from '../../lib/api';
import { useCartStore } from '../../context/CartStore';

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    getProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-200 animate-pulse rounded" />)}
    </div>
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border p-4 rounded shadow">
            <h2 className="font-bold">{product.name}</h2>
            <p>${product.price}</p>
            <p>Stock: {product.stockCount}</p>
            <button
              disabled={product.stockCount === 0}
              onClick={() => addToCart({ productId: product.id, name: product.name, price: product.price, quantity: 1, maxStock: product.stockCount })}
              className={`px-4 py-2 mt-2 rounded ${product.stockCount === 0 ? 'bg-gray-400' : 'bg-blue-500 text-white'}`}
            >
              {product.stockCount === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
