import { createContext, useContext, useState, ReactNode } from "react";

export interface CartItem {
  id: string;
  coupon_id: string;
  name: string;
  image: string;
  price: number;
  original_price: number;
  quantity: number;
  organization_name?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const ConsumerCartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
});

export const useConsumerCart = () => useContext(ConsumerCartContext);

export const ConsumerCartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, "id">) => {
    const existing = items.find((i) => i.coupon_id === item.coupon_id);
    if (existing) {
      setItems(items.map((i) =>
        i.coupon_id === item.coupon_id
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      ));
    } else {
      setItems([...items, { ...item, id: crypto.randomUUID() }]);
    }
  };

  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return removeItem(id);
    setItems(items.map((i) => (i.id === id ? { ...i, quantity } : i)));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <ConsumerCartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}>
      {children}
    </ConsumerCartContext.Provider>
  );
};
