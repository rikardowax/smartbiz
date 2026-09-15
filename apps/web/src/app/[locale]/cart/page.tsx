"use client";

import { Minus, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";

export default function CartPage() {
  const t = useTranslations("marketplace");
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const byShop = items.reduce((acc, item) => {
    const list = acc.get(item.shop.slug) ?? [];
    list.push(item);
    acc.set(item.shop.slug, list);
    return acc;
  }, new Map<string, typeof items>());

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-foreground">{t("cartEmpty")}</h1>
        <p className="mt-2 text-muted-foreground">{t("cartEmptySubtitle")}</p>
        <Button asChild className="mt-6">
          <Link href="/marketplace">{t("continueShopping")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("cartTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("cartItemCount", { count: itemCount })}
      </p>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="space-y-4">
          {Array.from(byShop.entries()).map(([shopSlug, shopItems]) => (
            <div key={shopSlug} className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Store className="h-4 w-4 shrink-0 text-primary" />
                <Link
                  href={`/shops/${shopSlug}`}
                  className="truncate text-sm font-semibold text-card-foreground hover:text-primary"
                >
                  {shopItems[0].shop.name}
                </Link>
              </div>

              <div className="divide-y divide-border">
                {shopItems.map((item) => (
                  <div key={item.productId} className="flex gap-3 p-4">
                    <Link
                      href={`/products/${item.shop.slug}/${item.slug}`}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted"
                    >
                      {item.image ? (
                        // biome-ignore lint/performance/noImgElement: images produits hébergées par les vendeurs
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-bold text-primary">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.shop.slug}/${item.slug}`}
                        className="line-clamp-2 text-sm font-medium text-card-foreground hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatPrice(item.price)} / {item.unit}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-input">
                          <button
                            type="button"
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="-"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold tabular">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            aria-label="+"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.productId)}
                          aria-label={t("remove")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-price shrink-0 text-sm font-bold">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Récapitulatif collant */}
        <div className="mt-5 lg:mt-0 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-card-foreground">{t("orderSummary")}</h2>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t("cartItemCount", { count: itemCount })}
                </dt>
                <dd className="font-medium text-card-foreground">{formatPrice(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("deliveryFeeLabel")}</dt>
                <dd className="text-muted-foreground">{t("deliveryFeeOnDelivery")}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <span className="font-semibold text-card-foreground">{t("orderTotal")}</span>
              <span className="text-price text-xl font-bold">{formatPrice(total)}</span>
            </div>

            <Button asChild className="mt-4 w-full">
              <Link href="/checkout">{t("checkout")}</Link>
            </Button>
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/marketplace">{t("continueShopping")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
