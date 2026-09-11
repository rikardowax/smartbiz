"use client";

import { Loader2, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { type CatalogProduct, ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
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
  _count?: { products: number };
}

function whatsappLink(phone: string, message: string) {
  const cleaned = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export default function ShopPage() {
  const t = useTranslations("marketplace");
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiFetch<PublicShop>(`/shops/public/${slug}`),
      apiFetch<{ items: CatalogProduct[] }>(`/catalog/products?shop=${slug}&limit=24&sort=popular`),
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
  }, [slug, t]);

  if (loading) {
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
          <Store className="h-12 w-12 text-primary" />
        </div>

        <h1 className="mt-4 text-3xl font-bold text-card-foreground">{shop.name}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{shop.description || "—"}</p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {shop.city}, {shop.country}
          </span>
          {shop.address && <span>{shop.address}</span>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {shop.whatsappNumber && (
            <Button asChild className="gap-2 bg-[#25D366] text-white hover:bg-[#128C7E]">
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

          <Button asChild variant="outline" className="gap-2">
            <a href={`tel:${shop.phone}`}>
              <Phone className="h-4 w-4" />
              {shop.phone}
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold text-foreground">
          {t("shopProducts")} ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <p className="text-lg font-medium text-card-foreground">{t("noResults")}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
