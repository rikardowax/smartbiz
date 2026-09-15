"use client";

import { MapPin, Package, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RatingStars } from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { discountPercent, formatCompact, formatPrice } from "@/lib/format";

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  unit: string;
  images: string[];
  stockQuantity: number;
  soldCount: number;
  ratingAverage: number;
  ratingCount: number;
  category: { name: string; slug: string };
  shop: { name: string; slug: string; city: string };
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function colorFromString(str: string) {
  const hue = [...str].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 45% 92%)`;
}

export function ProductCard({
  product,
  addToCart,
}: {
  product: CatalogProduct;
  addToCart?: () => void;
}) {
  const t = useTranslations("marketplace");
  const [imageError, setImageError] = useState(false);
  const image = product.images?.[0];
  const isPlaceholder = !image || imageError;
  const discount = discountPercent(product.price, product.compareAtPrice);
  const outOfStock = product.stockQuantity <= 0;
  const productHref = `/products/${product.shop.slug}/${product.slug}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart?.();
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card transition-all duration-200 hover:z-10 hover:border-primary/30 hover:shadow-[0_8px_28px_-6px_rgb(0_0_0/0.15)]">
      <Link href={productHref} className="absolute inset-0 z-0" aria-label={product.name} />

      <div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
        {!isPlaceholder ? (
          // biome-ignore lint/performance/noImgElement: images produits hébergées par les vendeurs
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center text-foreground/70"
            style={{ backgroundColor: colorFromString(product.category?.name ?? product.name) }}
          >
            <span className="text-2xl font-bold">{initials(product.name)}</span>
            <Package className="mt-1.5 h-5 w-5 opacity-40" />
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded-md bg-foreground/85 px-2.5 py-1 text-xs font-semibold text-background">
              {t("outOfStock")}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-card-foreground transition-colors group-hover:text-primary">
          {product.name}
        </h3>

        <div className="flex items-center gap-1.5">
          <RatingStars rating={product.ratingAverage} />
          <span className="text-[11px] text-muted-foreground">
            {product.ratingCount > 0
              ? t("reviewCount", { count: formatCompact(product.ratingCount) })
              : t("noReviewYet")}
          </span>
        </div>

        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {product.shop.name} <span className="opacity-50">|</span> {product.shop.city}
          </span>
        </p>

        <div className="mt-auto pt-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-price text-sm font-bold">{formatPrice(product.price)}</span>
            {discount > 0 && (
              <>
                <span className="rounded bg-primary/10 px-1 py-px text-[10px] font-bold text-primary">
                  -{discount}%
                </span>
                <span className="text-[11px] text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice as number)}
                </span>
              </>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t("soldCount", { count: formatCompact(product.soldCount) })}
          </p>
        </div>
      </div>

      {addToCart && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-1 p-3 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            size="sm"
            className="w-full gap-1.5 shadow-md"
            onClick={handleAddToCart}
            disabled={outOfStock}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {t("addToCart")}
          </Button>
        </div>
      )}
    </div>
  );
}
