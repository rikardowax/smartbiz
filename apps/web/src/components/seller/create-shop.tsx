"use client";

import { Loader2, Store, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { type User, useAuthStore } from "@/stores/auth-store";

const DEFAULT_CITIES = [
  "Yaoundé",
  "Douala",
  "Bafoussam",
  "Bamenda",
  "Bertoua",
  "Buea",
  "Ebolowa",
  "Garoua",
  "Kribi",
  "Limbe",
  "Maroua",
  "Ngaoundéré",
];

export function CreateShopForm() {
  const t = useTranslations("erp");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [cities, setCities] = useState<string[]>(DEFAULT_CITIES);
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<string[]>("/shops/public/cities")
      .then((res) => setCities(res.length ? res : DEFAULT_CITIES))
      .catch(() => setCities(DEFAULT_CITIES));
  }, []);

  useEffect(() => {
    apiFetch<{ name: string }[]>("/categories")
      .then((res) => setSuggestions(res.map((c) => c.name)))
      .catch(() => setSuggestions([]));
  }, []);

  const addInterest = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || interests.includes(trimmed) || interests.length >= 5) return;
    setInterests((prev) => [...prev, trimmed]);
    setInterestInput("");
  };

  const removeInterest = (value: string) => {
    setInterests((prev) => prev.filter((i) => i !== value));
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addInterest(interestInput);
    }
  };

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
          whatsappNumber: whatsapp.trim() || undefined,
          city: city.trim(),
          description: description.trim() || undefined,
          country: "Cameroun",
          interests: interests.length ? interests : undefined,
        }),
      });
      const me = await apiFetch<User>("/auth/me");
      setUser(me);
      toast.success(t("createShopSuccess"));
      router.push("/dashboard");
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
            <Label htmlFor="shopWhatsapp">{t("shopWhatsapp")}</Label>
            <Input
              id="shopWhatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder={t("shopWhatsappPlaceholder")}
            />
          </div>

          <div>
            <Label htmlFor="shopCity" required>
              {t("city")}
            </Label>
            <select
              id="shopCity"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className={cn(
                "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !city && "text-muted-foreground",
              )}
            >
              <option value="" disabled>
                {t("selectCity")}
              </option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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

          <div>
            <Label htmlFor="shopInterests">
              {t("interests")} ({interests.length}/5)
            </Label>
            <Input
              id="shopInterests"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={handleInterestKeyDown}
              placeholder={t("interestsPlaceholder")}
              disabled={interests.length >= 5}
            />
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={interests.includes(s) || interests.length >= 5}
                    onClick={() => addInterest(s)}
                    className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
            {interests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {interests.map((i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {i}
                    <button
                      type="button"
                      onClick={() => removeInterest(i)}
                      className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                      aria-label={t("removeInterest")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
