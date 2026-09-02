import { create } from 'zustand';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

interface CartState {
  cart: CartItem[];
  addToCart: (item: { productId: string; name: string; price: number; quantity: number; maxStock: number }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  addToCart: (item) =>
    set((state) => {
      const existingItem = state.cart.find((i) => i.productId === item.productId);
      if (existingItem) {
        const newQuantity = Math.min(existingItem.quantity + item.quantity, item.maxStock);
        return {
          cart: state.cart.map((i) =>
            i.productId === item.productId ? { ...i, quantity: newQuantity } : i
          ),
        };
      }
      return { cart: [...state.cart, { ...item, quantity: Math.min(item.quantity, item.maxStock) }] };
    }),
  removeFromCart: (productId) =>
    set((state) => ({ cart: state.cart.filter((i) => i.productId !== productId) })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      cart: state.cart.map((i) => 
        i.productId === productId ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i
      ),
    })),
  clearCart: () => set({ cart: [] }),
  get totalAmount() {
    return get().cart.reduce((total, item) => total + item.price * item.quantity, 0);
  },
  get totalItems() {
    return get().cart.reduce((total, item) => total + item.quantity, 0);
  },
}));
