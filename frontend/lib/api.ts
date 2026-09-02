import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// NOTE: There is no auth in this iteration. Until a real session is wired in,
// vendor-scoped endpoints are reached via a fixed vendor id. Replace this with
// an authenticated value once auth lands.
export const VENDOR_ID = '11111111-1111-1111-1111-111111111111';

export interface Product {
  id: string;
  name: string;
  price: number;
  stockCount: number;
  vendorId: string;
  vendorName: string;
  isActive: boolean;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'fulfilling'
  | 'fulfilled'
  | 'cancelled';

export type OrderTransitionAction = 'CONFIRM' | 'FULFILL' | 'SHIP' | 'CANCEL';

export interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  fulfillmentStatus: string;
  vendorReference?: string;
  failureReason?: string;
}

export interface Order {
  id: string;
  buyerId: string;
  status: OrderStatus;
  totalAmount: number;
  correlationId: string;
  shippingAddress?: string;
  lineItems: OrderLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  correlationId: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogResponse {
  total: number;
  logs: AuditLogEntry[];
}

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get('/catalog');
  return data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const { data } = await api.get(`/catalog/${id}`);
  return data;
};

export const createOrder = async (order: {
  buyerId: string;
  items: { productId: string; quantity: number }[];
  shippingAddress: string;
}): Promise<Order> => {
  const { data } = await api.post('/orders', order);
  return data;
};

export const getOrderById = async (id: string): Promise<Order> => {
  const { data } = await api.get(`/orders/${id}`);
  return data;
};

export interface CreateProductPayload {
  vendorId: string;
  name: string;
  price: number;
  stockCount: number;
}

export const getVendorProducts = async (
  vendorId: string = VENDOR_ID,
  includeInactive = true,
): Promise<Product[]> => {
  const { data } = await api.get(`/catalog/vendor/${vendorId}`, {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  });
  return data;
};

export const updateStock = async (
  productId: string,
  stockCount: number,
): Promise<Product> => {
  const { data } = await api.patch(`/catalog/${productId}`, { stockCount });
  return data;
};

export const createProduct = async (
  payload: CreateProductPayload,
): Promise<Product> => {
  const { data } = await api.post('/catalog', payload);
  return data;
};

// --- Iteration 2: vendor order management ---

export const getVendorOrders = async (
  vendorId: string = VENDOR_ID,
): Promise<Order[]> => {
  const { data } = await api.get(`/orders/vendor/${vendorId}`);
  return data;
};

export const transitionOrder = async (
  orderId: string,
  action: OrderTransitionAction,
  reason?: string,
): Promise<Order> => {
  const { data } = await api.post(`/orders/${orderId}/transition`, {
    action,
    reason,
  });
  return data;
};

export const getOrderAuditLogs = async (
  orderId: string,
): Promise<AuditLogResponse> => {
  const { data } = await api.get(`/orders/${orderId}/audit-logs`);
  return data;
};

export default api;
