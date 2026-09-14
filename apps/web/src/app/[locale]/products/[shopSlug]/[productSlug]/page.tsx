"use client";

import { Loader2, MapPin, MessageCircle, Minus, Plus, ShoppingCart, Store } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { type CatalogProduct, ProductCard } from "@/components/product-card";
import { SalesbotLink } from "@/components/salesbot-link";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { useCartStore } from "@/stores/cart-store";

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
  };
  related: CatalogProduct[];
}

function whatsappLink(phone: string, message: string) {
  const cleaned = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export default function ProductDetailPage() {
  const t = useTranslations("marketplace");
  const { shopSlug, productSlug } = useParams<{ shopSlug: string; productSlug: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!shopSlug || !productSlug) return;
    let cancelled = false;
    setLoading(true);
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
    return `Bonjour ${product.shop.name}, je suis intéressé par "${product.name}" (${product.price.toLocaleString()} FCFA).`;
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

  const image = product.images?.[0];
  const discounted = product.compareAtPrice && product.compareAtPrice > product.price;
  const outOfStock = product.stockQuantity <= 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted">
          {image ? (
            // biome-ignore lint/performance/noImgElement: external product images from sellers
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
              <span className="text-4xl font-bold">{product.name.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-sm text-muted-foreground">
            {product.category.name} ·{" "}
            <Link href={`/shops/${product.shop.slug}`} className="hover:underline">
              {product.shop.name}
            </Link>
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{product.name}</h1>
          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <div className="mt-6 flex items-end gap-3">
            <span className="text-3xl font-bold text-primary">
              {product.price.toLocaleString()} FCFA
            </span>
            {discounted && (
              <span className="text-lg text-muted-foreground line-through">
                {product.compareAtPrice!.toLocaleString()} FCFA
              </span>
            )}
          </div>

          <div className="mt-2 text-sm text-muted-foreground">
            {outOfStock
              ? t("outOfStock")
              : `${t("inStock")} : ${product.stockQuantity} ${product.unit}`}
          </div>

          <div className="mt-6 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {product.shop.city}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-lg border border-input">
              <button
                type="button"
                className="px-3 py-2 disabled:opacity-50"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                className="px-3 py-2 disabled:opacity-50"
                onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                disabled={quantity >= product.stockQuantity}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button className="flex-1 gap-2" onClick={handleAddToCart} disabled={outOfStock}>
              <ShoppingCart className="h-4 w-4" />
              {t("addToCart")}
            </Button>

            <SalesbotLink shopSlug={product.shop.slug} />

            {product.shop.whatsappNumber && (
              <Button asChild variant="outline" className="gap-2">
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

          <Link
            href={`/shops/${product.shop.slug}`}
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Store className="h-4 w-4" />
            {t("viewShop")}
          </Link>
        </div>
      </div>

      {product.related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-foreground">{t("relatedProducts")}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {product.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
