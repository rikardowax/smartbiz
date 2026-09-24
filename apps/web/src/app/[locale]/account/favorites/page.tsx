"use client";

import { Heart, Loader2, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { type CatalogProduct, ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useFavoritesStore } from "@/stores/favorites-store";

export default function FavoritesPage() {
  const t = useTranslations("account");
  const tFav = useTranslations("favorites");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: favoriteIds.length est le signal de rechargement quand un cœur est retiré depuis une carte
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<CatalogProduct[]>("/favorites")
      .then((res) => {
        if (!cancelled) setProducts(res);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, favoriteIds.length]);

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("favoritesTitle")}</h1>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-card-foreground">
            {tFav("loginRequired")}
          </h2>
          <Button asChild className="mt-4">
            <Link href="/login">{tFav("loginButton")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("favoritesTitle")}</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-card-foreground">{t("noFavorites")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("noFavoritesDesc")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/marketplace">{tFav("browse")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
