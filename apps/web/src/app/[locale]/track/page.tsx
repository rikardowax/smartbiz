"use client";

import { CheckCircle2, Loader2, MapPin, Package, Phone, Search, Store } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface TrackedOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  total: number;
  deliveryFee: number;
  contactName: string;
  deliveryCity: string | null;
  deliveryLine1: string | null;
  placedAt: string;
  shop: {
    name: string;
    slug: string;
    phone: string;
    whatsappNumber: string | null;
    logoUrl: string | null;
  };
  items: { id: string; productName: string; quantity: number; total: number }[];
  events: { id: string; status: OrderStatus; message: string; createdAt: string }[];
}

const STATUS_ORDER: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED"];

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/30",
  CONFIRMED: "bg-info/10 text-info border-info/30",
  PREPARING: "bg-info/10 text-info border-info/30",
  SHIPPED: "bg-primary/10 text-primary border-primary/30",
  DELIVERED: "bg-success/10 text-success border-success/30",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function TrackPage() {
  const t = useTranslations("track");
  const tOrder = useTranslations("orders");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("n") ?? "");
  const [phone, setPhone] = useState(searchParams.get("p") ?? "");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (num: string, tel: string) => {
    if (!num.trim() || !tel.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<TrackedOrder>("/orders/track", {
        method: "POST",
        body: JSON.stringify({ orderNumber: num.trim(), phone: tel.trim() }),
      });
      setOrder(res);
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  // Pré-remplissage depuis le checkout : /track?n=SB-…&p=+237…
  // biome-ignore lint/correctness/useExhaustiveDependencies: recherche unique au montage, pilotée par l'URL
  useEffect(() => {
    const n = searchParams.get("n");
    const p = searchParams.get("p");
    if (n && p) void search(n, p);
  }, []);

  const currentStep = order ? STATUS_ORDER.indexOf(order.status) : -1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Package className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search(orderNumber, phone);
        }}
        className="mt-6 rounded-xl border border-border bg-card p-5"
      >
        <label className="block text-sm font-medium text-card-foreground" htmlFor="trackNumber">
          {t("orderNumber")}
        </label>
        <input
          id="trackNumber"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          placeholder="SB-260924-4821"
          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm uppercase text-foreground outline-none placeholder:normal-case placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <label className="mt-4 block text-sm font-medium text-card-foreground" htmlFor="trackPhone">
          {t("phone")}
        </label>
        <input
          id="trackPhone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+237 6 XX XX XX XX"
          inputMode="tel"
          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        {error && (
          <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-4 w-full gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {t("track")}
        </Button>
      </form>

      {order && (
        <div className="mt-6 space-y-4">
          {/* En-tête commande */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-bold text-card-foreground">
                  {order.orderNumber}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(order.placedAt).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  STATUS_STYLES[order.status],
                )}
              >
                {tOrder(`status.${order.status}`)}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4">
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
              <div className="min-w-0 flex-1">
                <Link
                  href={`/shops/${order.shop.slug}`}
                  className="block truncate text-sm font-semibold text-card-foreground hover:text-primary"
                >
                  {order.shop.name}
                </Link>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {order.shop.phone}
                </p>
              </div>
            </div>
          </div>

          {/* Progression */}
          {order.status !== "CANCELLED" && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-card-foreground">{t("progress")}</h2>
              <ol className="mt-4 flex items-center">
                {STATUS_ORDER.map((step, i) => (
                  <li key={step} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                          i <= currentStep
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {i <= currentStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </span>
                    </div>
                    {i < STATUS_ORDER.length - 1 && (
                      <div
                        className={cn(
                          "mx-1 h-0.5 flex-1",
                          i < currentStep ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
                {STATUS_ORDER.map((step) => (
                  <span
                    key={step}
                    className={cn(
                      "w-1/5 text-center",
                      STATUS_ORDER.indexOf(step) <= currentStep && "text-primary",
                    )}
                  >
                    {tOrder(`statusShort.${step}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Historique */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-card-foreground">{t("history")}</h2>
            <ul className="mt-3 space-y-3">
              {[...order.events].reverse().map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground">
                      {tOrder(`status.${event.status}`)}
                    </p>
                    <p className="text-xs text-muted-foreground">{event.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {new Date(event.createdAt).toLocaleString(locale, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Contenu + livraison */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-card-foreground">{t("items")}</h2>
            <ul className="mt-3 divide-y divide-border/50">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate text-muted-foreground">
                    {item.quantity}× {item.productName}
                  </span>
                  <span className="shrink-0 font-medium text-card-foreground tabular">
                    {formatPrice(item.total)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-card-foreground">{t("total")}</span>
              <span className="text-base font-bold text-primary tabular">
                {formatPrice(order.total)}
              </span>
            </div>
            {(order.deliveryCity || order.deliveryLine1) && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {[order.deliveryLine1, order.deliveryCity].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
