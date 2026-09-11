"use client";

import { Loader2, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { type User, useAuthStore } from "@/stores/auth-store";

export function CreateShopForm() {
  const t = useTranslations("erp");
  const setUser = useAuthStore((s) => s.setUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !city.trim()) {
      toast.error(t("error"));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/shops", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          description: description.trim() || undefined,
          country: "Cameroun",
        }),
      });
      const me = await apiFetch<User>("/auth/me");
      setUser(me);
      toast.success(t("createShopSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl p-8">
      <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
        <Store className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-center text-xl font-bold text-card-foreground">{t("noShop")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("createShopSubtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="shopName" required>
              {t("shopName")}
            </Label>
            <Input
              id="shopName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("shopName")}
              required
            />
          </div>

          <div>
            <Label htmlFor="shopPhone" required>
              {t("phone")}
            </Label>
            <Input
              id="shopPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237699000001"
              required
            />
          </div>

          <div>
            <Label htmlFor="shopCity" required>
              {t("city")}
            </Label>
            <Input
              id="shopCity"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Yaoundé"
              required
            />
          </div>

          <div>
            <Label htmlFor="shopDescription">{t("description")}</Label>
            <Input
              id="shopDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("shopDescriptionPlaceholder")}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("createShop")}
          </Button>
        </form>
      </div>
    </div>
  );
}
