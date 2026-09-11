"use client";

import { Loader2, MapPin, MessageCircle, Search, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";

interface PublicShop {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  phone: string;
  whatsappNumber: string | null;
  _count?: { products: number };
}

function whatsappLink(phone: string, message: string) {
  const cleaned = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export default function ShopsPage() {
  const t = useTranslations("marketplace");
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "24");
      if (search.trim()) params.set("search", search.trim());
      if (city) params.set("city", city);
      const res = await apiFetch<{ items: PublicShop[] }>(`/shops/public?${params.toString()}`);
      setShops(res.items || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [search, city, t]);

  useEffect(() => {
    apiFetch<string[]>("/shops/public/cities")
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const applySearch = () => {
    setSearch(searchInput);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("shopsTitle")}</h1>
        <p className="text-muted-foreground">{t("shopsSubtitle")}</p>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            placeholder={t("shopsSearchPlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-10 appearance-none rounded-lg border border-input bg-background px-4 pr-8 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t("allCities")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <Button onClick={applySearch} disabled={loading} className="shrink-0">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("search")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !shops.length ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : shops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-lg font-medium text-card-foreground">{t("noShops")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shops.map((shop) => (
            <div
              key={shop.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 p-6">
                <Store className="h-12 w-12 text-primary" />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-semibold text-card-foreground">{shop.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {shop.description || "—"}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {shop.city}
                </div>
                <div className="mt-4 flex flex-1 items-end gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/shops/${shop.slug}`}>{t("viewShop")}</Link>
                  </Button>
                  {shop.whatsappNumber && (
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <a
                        href={whatsappLink(
                          shop.whatsappNumber,
                          `Bonjour ${shop.name}, je voudrais passer une commande.`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
