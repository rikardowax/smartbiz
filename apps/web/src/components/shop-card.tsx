"use client";

import { MapPin, MessageCircle, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { RatingStars } from "@/components/rating-stars";
import { SalesbotLink } from "@/components/salesbot-link";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export interface PublicShop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  phone: string;
  whatsappNumber: string | null;
  logoUrl?: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  _count?: { products: number };
}

function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}

export function ShopCard({ shop }: { shop: PublicShop }) {
  const t = useTranslations("marketplace");

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-[0_8px_28px_-6px_rgb(0_0_0/0.15)]">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
          {shop.logoUrl ? (
            // biome-ignore lint/performance/noImgElement: logos hébergés par les vendeurs
            <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-card-foreground">{shop.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {shop.city}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">
        {shop.description || "—"}
      </p>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {shop._count && <span>{t("shopProductCount", { count: shop._count.products })}</span>}
        {!!shop.ratingCount && shop.ratingCount > 0 && (
          <span className="flex items-center gap-1">
            <RatingStars rating={shop.ratingAverage ?? 0} />
            <span className="font-semibold text-foreground">{shop.ratingAverage?.toFixed(1)}</span>
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <Link href={`/shops/${shop.slug}`}>{t("viewShop")}</Link>
        </Button>
        <SalesbotLink shopSlug={shop.slug} size="sm" iconOnly className="shrink-0" />
        {shop.whatsappNumber && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <a
              href={whatsappLink(shop.whatsappNumber, t("whatsappShop", { name: shop.name }))}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("contactWhatsApp")}
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
