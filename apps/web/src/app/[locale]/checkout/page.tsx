"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";

const PAYMENT_METHODS = ["CASH_ON_DELIVERY", "MOBILE_MONEY", "BANK_TRANSFER", "CARD"] as const;

export default function CheckoutPage() {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [contactName, setContactName] = useState(
    user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "",
  );
  const [contactPhone, setContactPhone] = useState(user?.phone ?? "");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("CASH_ON_DELIVERY");

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-foreground">{t("cartEmpty")}</h1>
        <Button asChild className="mt-6">
          <Link href="/marketplace">{t("continueShopping")}</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !contactName.trim() ||
      !contactPhone.trim() ||
      !deliveryCity.trim() ||
      !deliveryLine1.trim()
    ) {
      toast.error(t("error"));
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiFetch<{ orders: { orderNumber: string }[] }>("/orders/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          deliveryCity: deliveryCity.trim(),
          deliveryLine1: deliveryLine1.trim(),
          deliveryNotes: deliveryNotes.trim() || undefined,
          paymentMethod,
        }),
      });
      clear();
      toast.success(t("orderSuccess"));
      // Une commande par boutique : on suit la première, la liste complète est
      // accessible depuis le compte ou via /track pour les invités.
      const first = created.orders?.[0];
      if (first?.orderNumber) {
        router.push(
          `/track?n=${encodeURIComponent(first.orderNumber)}&p=${encodeURIComponent(contactPhone.trim())}`,
        );
      } else {
        router.push("/marketplace");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("checkoutTitle")}</h1>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <form
          id="checkout-form"
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-5"
        >
          <h2 className="text-base font-semibold text-card-foreground">{t("deliveryInfo")}</h2>

          {!isAuthenticated && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              {t("guestCheckoutHint")}{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                {t("login")}
              </Link>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="checkoutName" required>
                {t("contactName")}
              </Label>
              <Input
                id="checkoutName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="checkoutPhone" required>
                {t("contactPhone")}
              </Label>
              <Input
                id="checkoutPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="checkoutCity" required>
                {t("deliveryCity")}
              </Label>
              <Input
                id="checkoutCity"
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="checkoutPayment">{t("orderPaymentMethod")}</Label>
              <select
                id="checkoutPayment"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`orderPaymentMethod${m}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="checkoutAddress" required>
              {t("deliveryAddress")}
            </Label>
            <Input
              id="checkoutAddress"
              value={deliveryLine1}
              onChange={(e) => setDeliveryLine1(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="checkoutNotes">{t("deliveryNotes")}</Label>
            <Input
              id="checkoutNotes"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder={t("deliveryNotesPlaceholder")}
            />
          </div>
        </form>

        {/* Récapitulatif collant */}
        <div className="mt-5 lg:mt-0 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-card-foreground">{t("orderSummary")}</h2>

            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.image ? (
                      // biome-ignore lint/performance/noImgElement: images produits hébergées par les vendeurs
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xs font-bold text-primary">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-card-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-card-foreground">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
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

            <Button
              type="submit"
              form="checkout-form"
              className="mt-4 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("placeOrder")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
