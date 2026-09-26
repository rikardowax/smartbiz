"use client";

import { ChevronRight, Loader2, Package, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface BuyerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  total: number;
  contactPhone: string;
  placedAt: string;
  shop: { id: string; name: string; slug: string; logoUrl: string | null; phone: string };
  items: {
    id: string;
    productName: string;
    quantity: number;
    total: number;
    product: { images: string[]; slug: string } | null;
  }[];
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/30",
  CONFIRMED: "bg-info/10 text-info border-info/30",
  PREPARING: "bg-info/10 text-info border-info/30",
  SHIPPED: "bg-primary/10 text-primary border-primary/30",
  DELIVERED: "bg-success/10 text-success border-success/30",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function OrdersPage() {
  const t = useTranslations("account");
  const tOrder = useTranslations("orders");
  const locale = useLocale();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    apiFetch<{ items: BuyerOrder[] }>("/orders/mine?limit=30")
      .then((res) => setOrders(res.items ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("ordersTitle")}</h1>

      {!isAuthenticated ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-12 text-center">
          <Package className="h-8 w-8 text-primary" />
          <Button asChild className="mt-4">
            <Link href="/login">{tOrder("loginToSee")}</Link>
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-card-foreground">{tOrder("empty")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tOrder("emptyDesc")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/marketplace">{tOrder("browse")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/track?n=${encodeURIComponent(order.orderNumber)}&p=${encodeURIComponent(order.contactPhone)}`}
              className="block rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                    {order.shop.logoUrl ? (
                      // biome-ignore lint/performance/noImgElement: logos hébergés par les vendeurs
                      <img
                        src={order.shop.logoUrl}
                        alt={order.shop.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">
                      {order.orderNumber}
                    </p>
                    <Link
                      href={`/shops/${order.shop.slug}`}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      {order.shop.name}
                    </Link>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                    STATUS_STYLES[order.status],
                  )}
                >
                  {tOrder(`status.${order.status}`)}
                </span>
              </div>

              <ul className="mt-3 space-y-1 border-t border-border/50 pt-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-muted-foreground">
                      {item.quantity}× {item.productName}
                    </span>
                    <span className="shrink-0 font-medium text-card-foreground tabular">
                      {formatPrice(item.total)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-sm">
                <span className="text-xs text-muted-foreground">
                  {new Date(order.placedAt).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-2 font-bold text-foreground">
                  {formatPrice(order.total)}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
