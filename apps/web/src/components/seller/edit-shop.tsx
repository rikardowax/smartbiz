"use client";

import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

interface ShopDetail {
  name: string;
  description: string | null;
  phone: string;
  whatsappNumber: string | null;
  city: string;
  address: string | null;
}

export function EditShopForm({
  shopId,
  onCancel,
  onSuccess,
}: {
  shopId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("erp");
  const [form, setForm] = useState<ShopDetail | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charge les valeurs actuelles à l'ouverture du formulaire.
  useEffect(() => {
    apiFetch<ShopDetail>(`/shops/${shopId}`)
      .then(setForm)
      .catch(() => toast.error(t("error")));
  }, [shopId, t]);

  if (!form) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const set = (key: keyof ShopDetail) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim()) {
      toast.error(t("error"));
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch(`/shops/${shopId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          phone: form.phone.trim(),
          whatsappNumber: form.whatsappNumber?.trim() || undefined,
          city: form.city.trim(),
          address: form.address?.trim() || undefined,
        }),
      });
      toast.success(t("shopUpdated"));
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
      <div>
        <Label htmlFor={`shopName-${shopId}`} required>
          {t("shopName")}
        </Label>
        <Input id={`shopName-${shopId}`} value={form.name} onChange={set("name")} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`shopPhone-${shopId}`} required>
            {t("shopPhone")}
          </Label>
          <Input
            id={`shopPhone-${shopId}`}
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            required
          />
        </div>
        <div>
          <Label htmlFor={`shopWa-${shopId}`}>WhatsApp</Label>
          <Input
            id={`shopWa-${shopId}`}
            type="tel"
            placeholder="+237 6 XX XX XX XX"
            value={form.whatsappNumber ?? ""}
            onChange={set("whatsappNumber")}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`shopCity-${shopId}`} required>
            {t("shopCity")}
          </Label>
          <Input id={`shopCity-${shopId}`} value={form.city} onChange={set("city")} required />
        </div>
        <div>
          <Label htmlFor={`shopAddress-${shopId}`}>{t("shopAddress")}</Label>
          <Input
            id={`shopAddress-${shopId}`}
            value={form.address ?? ""}
            onChange={set("address")}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`shopDesc-${shopId}`}>{t("shopDescription")}</Label>
        <Input
          id={`shopDesc-${shopId}`}
          value={form.description ?? ""}
          onChange={set("description")}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1 gap-1.5" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("save")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
