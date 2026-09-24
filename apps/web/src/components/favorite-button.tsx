"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useFavoritesStore } from "@/stores/favorites-store";

/**
 * Bouton cœur : bascule un produit en favori.
 * Redirige les visiteurs anonymes vers la connexion.
 */
export function FavoriteButton({
  productId,
  variant = "overlay",
  className,
}: {
  productId: string;
  /** `overlay` : pastille blanche posée sur une image ; `inline` : bouton classique. */
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const t = useTranslations("favorites");
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { ids, init, toggle } = useFavoritesStore();
  const [busy, setBusy] = useState(false);
  const favorited = ids.includes(productId);

  useEffect(() => {
    init();
  }, [init]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info(t("loginRequired"));
      router.push("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const added = await toggle(productId);
      toast.success(added ? t("added") : t("removed"));
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={favorited ? t("remove") : t("add")}
      aria-pressed={favorited}
      className={cn(
        variant === "overlay" &&
          "flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 disabled:opacity-50",
        variant === "inline" &&
          "flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-primary hover:text-primary disabled:opacity-50",
        className,
      )}
    >
      <Heart
        className={cn(
          variant === "overlay" ? "h-4 w-4" : "h-5 w-5",
          favorited
            ? "fill-primary text-primary"
            : variant === "overlay"
              ? "text-foreground/60"
              : "",
          busy && "animate-pulse",
        )}
      />
      {variant === "inline" && <span>{favorited ? t("favorited") : t("add")}</span>}
    </button>
  );
}
