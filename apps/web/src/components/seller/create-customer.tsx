"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";

export function CreateCustomerForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    if (!name.trim() || !phone.trim()) {
      toast.error(t("error"));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`/shops/${shopId}/customers`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      toast.success(t("createCustomerSuccess"));
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
      <h2 className="text-lg font-semibold text-card-foreground">{t("addCustomer")}</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customerName" required>
            {t("name")}
          </Label>
          <Input
            id="customerName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("name")}
            required
          />
        </div>
        <div>
          <Label htmlFor="customerPhone" required>
            {t("phone")}
          </Label>
          <Input
            id="customerPhone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+237699000001"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customerEmail">{t("email")}</Label>
          <Input
            id="customerEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
          />
        </div>
        <div>
          <Label htmlFor="customerCity">{t("city")}</Label>
          <Input
            id="customerCity"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Yaoundé"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="customerAddress">{t("address")}</Label>
        <Input
          id="customerAddress"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t("customerAddressPlaceholder")}
        />
      </div>

      <div>
        <Label htmlFor="customerNotes">{t("notes")}</Label>
        <Input
          id="customerNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("customerNotesPlaceholder")}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addCustomer")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
