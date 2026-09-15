"use client";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { FilterCheckbox, FilterSection } from "@/components/marketplace/filter-section";
import { type PublicShop, ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ShopsPage() {
  const t = useTranslations("marketplace");
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    apiFetch<string[]>("/shops/public/cities")
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (search.trim()) params.set("search", search.trim());
      if (city) params.set("city", city);
      const res = await apiFetch<{ items: PublicShop[]; meta: { total: number } }>(
        `/shops/public?${params.toString()}`,
      );
      setShops(res.items || []);
      setTotal(res.meta?.total ?? res.items?.length ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [search, city, t]);

  useEffect(() => {
    load();
  }, [load]);

  const clearAll = () => {
    setSearchInput("");
    setSearch("");
    setCity("");
  };

  const activeCount = (city ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("shopsTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("shopsSubtitle")}</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="h-11 pl-9 pr-9"
            placeholder={t("shopsSearchPlaceholder")}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={t("clearSearch")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button className="h-11 px-6" onClick={() => setSearch(searchInput)}>
          {t("search")}
        </Button>
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[232px_1fr] lg:gap-7">
        <aside
          className={cn(
            "mb-5 rounded-xl border border-border bg-card p-4 lg:mb-0 lg:self-start lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0",
            !showFilters && "hidden lg:block",
          )}
        >
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-semibold text-foreground">{t("filters")}</h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("clearAll")}
              </button>
            )}
          </div>

          {cities.length > 0 && (
            <FilterSection title={t("city")}>
              {cities.map((c) => (
                <FilterCheckbox
                  key={c}
                  label={c}
                  checked={city === c}
                  onChange={(checked) => setCity(checked ? c : "")}
                />
              ))}
            </FilterSection>
          )}
        </aside>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {search
                ? t("resultsCountFor", { count: total, query: search })
                : t("resultsCount", { count: total })}
            </p>

            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5 lg:hidden"
              onClick={() => setShowFilters((s) => !s)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("filters")}
              {activeCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : shops.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <p className="font-medium text-card-foreground">{t("noShops")}</p>
              {activeCount > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>
                  {t("clearAll")}
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
