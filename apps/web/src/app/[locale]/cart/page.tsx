"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
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

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t("cartEmpty")}</h1>
        <p className="mt-2 text-muted-foreground">{t("cartEmptySubtitle")}</p>
        <Button asChild className="mt-6">
          <Link href="/marketplace">{t("continueShopping")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">{t("cartTitle")}</h1>

      <div className="mt-6 space-y-6">
        {Array.from(byShop.entries()).map(([shopSlug, shopItems]) => (
          <div key={shopSlug} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              <Link href={`/shops/${shopSlug}`} className="hover:underline">
                {shopItems[0].shop.name}
              </Link>
            </h2>

            <div className="divide-y divide-border">
              {shopItems.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 py-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-muted">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xs font-bold text-primary">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <Link
                      href={`/products/${item.shop.slug}/${item.slug}`}
                      className="font-medium text-card-foreground hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.price.toLocaleString()} FCFA / {item.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="min-w-[80px] text-right font-semibold text-card-foreground">
                    {(item.price * item.quantity).toLocaleString()} FCFA
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-card-foreground">{t("orderTotal")}</span>
          <span className="text-2xl font-bold text-primary">{total.toLocaleString()} FCFA</span>
        </div>
        <Button asChild className="mt-4 w-full">
          <Link href="/checkout">{t("checkout")}</Link>
        </Button>
      </div>
    </div>
  );
}
