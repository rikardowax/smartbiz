"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const PAYMENT_METHODS = ["CASH_ON_DELIVERY", "MOBILE_MONEY", "BANK_TRANSFER", "CARD"] as const;
const PAYMENT_STATUSES = ["PENDING", "PAID", "PARTIAL"] as const;
const CHANNELS = ["IN_STORE", "WHATSAPP", "MARKETPLACE"] as const;

export function CreateManualOrderForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH_ON_DELIVERY" | "MOBILE_MONEY" | "BANK_TRANSFER" | "CARD"
  >("CASH_ON_DELIVERY");
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID" | "PARTIAL">("PAID");
  const [channel, setChannel] = useState<"IN_STORE" | "WHATSAPP" | "MARKETPLACE">("IN_STORE");

  useEffect(() => {
    if (!shopId) return;
    apiFetch<{ items: Product[] }>(`/shops/${shopId}/products?limit=500`)
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, [shopId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

  const addItem = () => {
    if (!selectedProduct) return;
    const q = Number.parseInt(quantity, 10);
    if (Number.isNaN(q) || q <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === selectedProduct.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === selectedProduct.id ? { ...i, quantity: i.quantity + q } : i,
        );
      }
      return [
        ...prev,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: q,
        },
      ];
    });
    setSelectedProductId("");
    setQuantity("1");
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const fee = Number.parseInt(deliveryFee, 10) || 0;
  const disc = Number.parseInt(discount, 10) || 0;
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal + fee - disc);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    if (!contactName.trim() || !contactPhone.trim() || items.length === 0) {
      toast.error(t("error"));
      return;
    }

    const payload: Record<string, unknown> = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      channel,
      paymentMethod,
      paymentStatus,
      deliveryCity: deliveryCity.trim() || undefined,
      deliveryLine1: deliveryLine1.trim() || undefined,
      deliveryFee: fee || undefined,
      discount: disc || undefined,
    };

    setIsSubmitting(true);
    try {
      await apiFetch(`/shops/${shopId}/orders`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(t("createOrderSuccess"));
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-card-foreground">{t("addOrder")}</h2>

      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
        <h3 className="text-sm font-medium text-muted-foreground">{t("orderItems")}</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,auto,auto]">
          <div>
            <Label htmlFor="orderProduct">{t("orderProduct")}</Label>
            <select
              id="orderProduct"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !selectedProductId && "text-muted-foreground",
              )}
            >
              <option value="">{t("selectProduct")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price.toLocaleString()} FCFA / {p.unit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="orderQuantity">{t("quantity")}</Label>
            <Input
              id="orderQuantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={addItem} disabled={!selectedProductId}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("orderAddItem")}
            </Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="divide-y divide-border rounded-lg border border-border/60 bg-background">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-card-foreground">
                  {item.name} x {item.quantity}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-card-foreground">
                    {(item.price * item.quantity).toLocaleString()} FCFA
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(item.productId)}
                    className="h-7 w-7 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end text-sm font-semibold text-card-foreground">
          {t("orderTotal")} : {total.toLocaleString()} FCFA
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="orderContactName" required>
            {t("orderContactName")}
          </Label>
          <Input
            id="orderContactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder={t("orderContactName")}
            required
          />
        </div>
        <div>
          <Label htmlFor="orderContactPhone" required>
            {t("orderContactPhone")}
          </Label>
          <Input
            id="orderContactPhone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+237699000001"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="orderDeliveryCity">{t("orderDeliveryCity")}</Label>
          <Input
            id="orderDeliveryCity"
            value={deliveryCity}
            onChange={(e) => setDeliveryCity(e.target.value)}
            placeholder="Yaoundé"
          />
        </div>
        <div>
          <Label htmlFor="orderDeliveryAddress">{t("orderDeliveryAddress")}</Label>
          <Input
            id="orderDeliveryAddress"
            value={deliveryLine1}
            onChange={(e) => setDeliveryLine1(e.target.value)}
            placeholder={t("orderDeliveryAddress")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="orderDeliveryFee">{t("orderDeliveryFee")}</Label>
          <Input
            id="orderDeliveryFee"
            type="number"
            min={0}
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="orderDiscount">{t("orderDiscount")}</Label>
          <Input
            id="orderDiscount"
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="orderChannel">{t("orderChannel")}</Label>
          <select
            id="orderChannel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof channel)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {t(`orderChannel${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="orderPaymentMethod">{t("orderPaymentMethod")}</Label>
          <select
            id="orderPaymentMethod"
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
        <div>
          <Label htmlFor="orderPaymentStatus">{t("orderPaymentStatus")}</Label>
          <select
            id="orderPaymentStatus"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`orderPaymentStatus${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSubmitting || items.length === 0}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addOrder")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
