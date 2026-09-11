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

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("checkoutTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("loginToCheckout")}</p>
        <Button asChild className="mt-6">
          <Link href="/login">{t("login")}</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
        <ShoppingCart className="h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t("cartEmpty")}</h1>
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
      await apiFetch("/orders/checkout", {
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
      router.push("/marketplace");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">{t("checkoutTitle")}</h1>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">{t("orderSummary")}</h2>
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="text-card-foreground">
                {item.name} x {item.quantity}
              </span>
              <span className="font-medium">
                {(item.price * item.quantity).toLocaleString()} FCFA
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-2 text-lg font-bold text-primary">
            {t("orderTotal")}: {total.toLocaleString()} FCFA
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-card-foreground">{t("deliveryInfo")}</h2>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("placeOrder")}
        </Button>
      </form>
    </div>
  );
}
