"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";

export default function FavoritesPage() {
  const t = useTranslations("account");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("favoritesTitle")}</h1>

      <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-card-foreground">{t("noFavorites")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("noFavoritesDesc")}</p>
      </div>
    </div>
  );
}
