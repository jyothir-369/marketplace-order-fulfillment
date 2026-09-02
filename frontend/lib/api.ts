import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stockCount: number;
  vendorId: string;
}

export interface Order {
  id: string;
  buyerId: string;
  status: string;
  totalAmount: number;
}

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get('/catalog');
  return data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const { data } = await api.get(`/catalog/${id}`);
  return data;
};

export const createOrder = async (order: { buyerId: string; items: { productId: string; quantity: number }[]; shippingAddress: string }): Promise<Order> => {
  const { data } = await api.post('/orders', order);
  return data;
};

export const getOrderById = async (id: string): Promise<Order> => {
  const { data } = await api.get(`/orders/${id}`);
  return data;
};

export default api;
