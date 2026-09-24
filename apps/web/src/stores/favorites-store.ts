import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface FavoritesState {
  ids: string[];
  loaded: boolean;
  /** Charge la liste des favoris une fois l'utilisateur connecté. */
  init: () => Promise<void>;
  /** Bascule l'état favori — mise à jour optimiste, annulée en cas d'erreur. */
  toggle: (productId: string) => Promise<boolean>;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  loaded: false,

  init: async () => {
    if (get().loaded || !useAuthStore.getState().isAuthenticated) return;
    set({ loaded: true });
    try {
      const ids = await apiFetch<string[]>("/favorites/ids");
      set({ ids });
    } catch {
      // Échec silencieux : les cœurs restent vides, l'utilisateur peut réessayer.
    }
  },

  toggle: async (productId) => {
    const was = get().ids.includes(productId);
    set({ ids: was ? get().ids.filter((i) => i !== productId) : [...get().ids, productId] });
    try {
      const res = await apiFetch<{ favorited: boolean }>(`/favorites/${productId}/toggle`, {
        method: "POST",
      });
      set({
        ids: res.favorited
          ? [...new Set([...get().ids, productId])]
          : get().ids.filter((i) => i !== productId),
      });
      return res.favorited;
    } catch (err) {
      set({ ids: was ? [...get().ids, productId] : get().ids.filter((i) => i !== productId) });
      throw err;
    }
  },

  reset: () => set({ ids: [], loaded: false }),
}));

// Les cœurs appartiennent à la session : à la déconnexion on vide tout.
useAuthStore.subscribe((state) => {
  if (!state.isAuthenticated) useFavoritesStore.getState().reset();
});
