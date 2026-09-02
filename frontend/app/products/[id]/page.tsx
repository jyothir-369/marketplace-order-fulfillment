'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProductById, Product } from '../../../lib/api';
import { useCartStore } from '../../../context/CartStore';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    if (id) {
      getProductById(id).then(setProduct);
    }
  }, [id]);

  if (!product) return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 w-1/2 mb-4" />
      <div className="h-6 bg-gray-200 w-1/4 mb-4" />
      <div className="h-24 bg-gray-200 w-full mb-4" />
    </div>
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-xl">${product.price}</p>
      <p className="my-4">{product.description}</p>
      <p>Stock: {product.stockCount}</p>
      <button
        disabled={product.stockCount === 0}
        onClick={() => addToCart({ productId: product.id, name: product.name, price: product.price, quantity: 1, maxStock: product.stockCount })}
        className={`px-4 py-2 mt-4 rounded ${product.stockCount === 0 ? 'bg-gray-400' : 'bg-blue-500 text-white'}`}
      >
        {product.stockCount === 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  );
}
