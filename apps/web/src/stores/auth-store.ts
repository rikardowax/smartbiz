import { create } from "zustand";
import { persist } from "zustand/middleware";
import { attachCartToUser, detachCart } from "./cart-store";

export interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  role: string;
  locale: string | null;
  avatarUrl: string | null;
  shops?: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
    currency: string;
  }[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (data: { accessToken: string; refreshToken: string; user: User }) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (data) => {
        const previousUserId = get().user?.id;
        if (previousUserId && previousUserId !== data.user.id) {
          detachCart(previousUserId);
        }
        attachCartToUser(data.user.id);
        set({ ...data, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        const userId = get().user?.id;
        if (userId) detachCart(userId);
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "smartbiz-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
