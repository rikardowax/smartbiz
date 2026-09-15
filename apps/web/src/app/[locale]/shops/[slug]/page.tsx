"use client";

import { ChevronRight, Loader2, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { type CatalogProduct, ProductCard } from "@/components/product-card";
import { SalesbotLink } from "@/components/salesbot-link";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

interface PublicShop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  country: string;
  phone: string;
  whatsappNumber: string | null;
  address: string | null;
  logoUrl?: string | null;
  _count?: { products: number };
}

function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}

const SORTS = ["popular", "recent", "price_asc", "price_desc"] as const;

export default function ShopPage() {
  const t = useTranslations("marketplace");
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [sort, setSort] = useState<(typeof SORTS)[number]>("popular");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiFetch<PublicShop>(`/shops/public/${slug}`),
      apiFetch<{ items: CatalogProduct[] }>(`/catalog/products?shop=${slug}&limit=24&sort=${sort}`),
    ])
      .then(([shopRes, productsRes]) => {
        if (cancelled) return;
        setShop(shopRes);
        setProducts(productsRes.items || []);
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
  }, [slug, sort, t]);

  if (loading && !shop) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error || t("noShops")}
        </div>
      </div>
    );
  }

  const whatsappMessage = `Bonjour ${shop.name}, je voudrais commander un produit.`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-1 pb-4 text-xs text-muted-foreground">
        <Link href="/shops" className="shrink-0 hover:text-primary">
          {t("shopsTitle")}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="truncate text-foreground">{shop.name}</span>
      </nav>

      {/* Bandeau boutique */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-24 bg-brand-gradient sm:h-28" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="-mt-14 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-primary/10 sm:-mt-16 sm:h-24 sm:w-24">
            {shop.logoUrl ? (
              // biome-ignore lint/performance/noImgElement: logos hébergés par les vendeurs
              <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-10 w-10 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-card-foreground sm:text-2xl">{shop.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {shop.city}, {shop.country}
              </span>
              {shop._count && <span>{t("shopProductCount", { count: shop._count.products })}</span>}
            </div>
            {shop.description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{shop.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <SalesbotLink shopSlug={shop.slug} size="sm" />
            {shop.whatsappNumber && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a
                  href={whatsappLink(shop.whatsappNumber, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  {t("contactWhatsApp")}
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={`tel:${shop.phone}`}>
                <Phone className="h-4 w-4" />
                {shop.phone}
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Catalogue de la boutique */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-foreground">{t("shopProducts")}</h2>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("sortBy")}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="popular">{t("sortPopular")}</option>
            <option value="recent">{t("sortRecent")}</option>
            <option value="price_asc">{t("sortPriceAsc")}</option>
            <option value="price_desc">{t("sortPriceDesc")}</option>
          </select>
        </label>
      </div>

      <div className={cn("mt-4", loading && "opacity-60")}>
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <p className="font-medium text-card-foreground">{t("noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                addToCart={() =>
                  addItem({
                    productId: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    unit: product.unit,
                    quantity: 1,
                    image: product.images?.[0],
                    shop: product.shop,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
