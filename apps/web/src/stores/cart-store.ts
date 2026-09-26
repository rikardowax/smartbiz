import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  unit: string;
  quantity: number;
  image?: string;
  shop: { name: string; slug: string; whatsappNumber?: string | null };
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  itemCount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },
      removeItem: (productId) => {
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
      },
      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        }));
      },
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "smartbiz-cart" },
  ),
);

const userCartKey = (userId: string) => `smartbiz-cart-user:${userId}`;

function readUserCart(userId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(userCartKey(userId));
    return raw ? (JSON.parse(raw).state?.items ?? []) : [];
  } catch {
    return [];
  }
}

function writeUserCart(userId: string, items: CartItem[]) {
  localStorage.setItem(userCartKey(userId), JSON.stringify({ state: { items }, version: 0 }));
}

function mergeItems(a: CartItem[], b: CartItem[]): CartItem[] {
  const merged = [...a];
  for (const item of b) {
    const existing = merged.find((i) => i.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.push({ ...item });
    }
  }
  return merged;
}

// Called on login/register: merges the guest cart into the user's saved cart.
export function attachCartToUser(userId: string) {
  if (typeof window === "undefined") return;
  const merged = mergeItems(readUserCart(userId), useCartStore.getState().items);
  writeUserCart(userId, merged);
  useCartStore.setState({ items: merged });
}

// Called on logout: persists the cart under the user key, then resets the
// active cart so the next person on this device starts empty.
export function detachCart(userId: string) {
  if (typeof window === "undefined") return;
  writeUserCart(userId, useCartStore.getState().items);
  useCartStore.setState({ items: [] });
}
