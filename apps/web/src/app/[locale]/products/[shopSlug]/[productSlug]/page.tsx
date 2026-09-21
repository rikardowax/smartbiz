"use client";

import {
  ChevronRight,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  ShoppingCart,
  Store,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { type CatalogProduct, ProductCard } from "@/components/product-card";
import { RatingStars } from "@/components/rating-stars";
import { SalesbotLink } from "@/components/salesbot-link";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { discountPercent, formatCompact, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { firstName: string | null; lastName: string | null; avatarUrl: string | null };
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  unit: string;
  images: string[];
  stockQuantity: number;
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
  category: { name: string; slug: string };
  shop: {
    id: string;
    name: string;
    slug: string;
    city: string;
    phone: string;
    whatsappNumber: string | null;
    logoUrl?: string | null;
  };
  reviews?: Review[];
  related: CatalogProduct[];
}

function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}

function reviewerName(user: Review["user"]) {
  const name = `${user.firstName ?? ""} ${user.lastName?.charAt(0) ?? ""}`.trim();
  return name || "—";
}

export default function ProductDetailPage() {
  const t = useTranslations("marketplace");
  const { shopSlug, productSlug } = useParams<{ shopSlug: string; productSlug: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!shopSlug || !productSlug) return;
    let cancelled = false;
    setLoading(true);
    setActiveImage(0);
    setQuantity(1);
    apiFetch<ProductDetail>(`/catalog/products/${shopSlug}/${productSlug}`)
      .then((res) => {
        if (!cancelled) setProduct(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopSlug, productSlug, t]);

  const whatsappMessage = useMemo(() => {
    if (!product) return "";
    return `Bonjour ${product.shop.name}, je suis intéressé par "${product.name}" (${formatPrice(product.price)}).`;
  }, [product]);

  const handleAddToCart = () => {
    if (!product || product.stockQuantity <= 0) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      unit: product.unit,
      quantity,
      image: product.images?.[0],
      shop: product.shop,
    });
    setQuantity(1);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error || t("noResults")}
        </div>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const mainImage = images[activeImage];
  const discount = discountPercent(product.price, product.compareAtPrice);
  const outOfStock = product.stockQuantity <= 0;
  const reviews = product.reviews ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-1 overflow-x-auto pb-4 text-xs text-muted-foreground">
        <Link href="/marketplace" className="shrink-0 hover:text-primary">
          {t("title")}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href={`/shops/${product.shop.slug}`} className="shrink-0 hover:text-primary">
          {product.shop.name}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Colonne gauche : galerie, description, avis */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            <div className="relative aspect-square">
              {mainImage ? (
                // biome-ignore lint/performance/noImgElement: images produits hébergées par les vendeurs
                <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary/5 text-primary">
                  <Package className="h-12 w-12 opacity-50" />
                  <span className="text-3xl font-bold">
                    {product.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {discount > 0 && (
                <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow">
                  -{discount}%
                </span>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {images.map((img, index) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                    index === activeImage
                      ? "border-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {/* biome-ignore lint/performance/noImgElement: vignettes produits */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {product.description && (
            <section className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-card-foreground">
                {t("descriptionTitle")}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </section>
          )}

          <section className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-card-foreground">{t("reviewsTitle")}</h2>
              {product.ratingCount > 0 && (
                <div className="flex items-center gap-2">
                  <RatingStars rating={product.ratingAverage} size="md" />
                  <span className="text-sm font-semibold text-foreground">
                    {product.ratingAverage.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("reviewCount", { count: formatCompact(product.ratingCount) })}
                  </span>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("noReviewYet")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {reviews.map((review) => (
                  <li key={review.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <RatingStars rating={review.rating} />
                      <span className="text-sm font-medium text-card-foreground">
                        {reviewerName(review.user)}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-1.5 text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Colonne droite : panneau d'achat collant */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">{product.category.name}</p>
            <h1 className="mt-1 text-xl font-bold leading-snug text-card-foreground">
              {product.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <RatingStars rating={product.ratingAverage} />
                {product.ratingCount > 0
                  ? t("reviewCount", { count: formatCompact(product.ratingCount) })
                  : t("noReviewYet")}
              </span>
              <span>·</span>
              <span>{t("soldCount", { count: formatCompact(product.soldCount) })}</span>
            </div>

            <div className="mt-4 rounded-lg bg-muted/60 p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-price text-2xl font-bold">{formatPrice(product.price)}</span>
                {discount > 0 && (
                  <>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                      -{discount}%
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.compareAtPrice as number)}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("perUnit", { unit: product.unit })}
              </p>
            </div>

            <p
              className={cn(
                "mt-3 text-sm font-medium",
                outOfStock ? "text-destructive" : "text-success",
              )}
            >
              {outOfStock
                ? t("outOfStock")
                : t("inStockCount", { count: product.stockQuantity, unit: product.unit })}
            </p>

            {!outOfStock && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t("quantity")}</span>
                <div className="flex items-center rounded-lg border border-input">
                  <button
                    type="button"
                    className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="-"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold tabular">{quantity}</span>
                  <button
                    type="button"
                    className="px-3 py-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                    disabled={quantity >= product.stockQuantity}
                    aria-label="+"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <Button className="w-full gap-2" onClick={handleAddToCart} disabled={outOfStock}>
                <ShoppingCart className="h-4 w-4" />
                {t("addToCart")}
              </Button>

              <SalesbotLink shopSlug={product.shop.slug} className="w-full" />

              {product.shop.whatsappNumber && (
                <Button asChild variant="outline" className="w-full gap-2">
                  <a
                    href={whatsappLink(product.shop.whatsappNumber, whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t("contactWhatsApp")}
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Carte vendeur */}
          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                {product.shop.logoUrl ? (
                  // biome-ignore lint/performance/noImgElement: logos hébergés par les vendeurs
                  <img
                    src={product.shop.logoUrl}
                    alt={product.shop.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/shops/${product.shop.slug}`}
                  className="block truncate font-semibold text-card-foreground hover:text-primary"
                >
                  {product.shop.name}
                </Link>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {product.shop.city}
                </p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href={`/shops/${product.shop.slug}`}>{t("viewShop")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <a href={`tel:${product.shop.phone}`} aria-label={product.shop.phone}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {product.related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{t("relatedProducts")}</h2>
          <div className="animate-grid-in mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {product.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
