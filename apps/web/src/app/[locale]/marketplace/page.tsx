"use client";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { FilterCheckbox, FilterSection } from "@/components/marketplace/filter-section";
import { type CatalogProduct, ProductCard } from "@/components/product-card";
import { RatingStars } from "@/components/rating-stars";
import { type PublicShop, ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

const RATING_FILTERS = [4, 3, 2] as const;

export default function MarketplacePage() {
  const t = useTranslations("marketplace");
  const addItem = useCartStore((s) => s.addItem);

  const [tab, setTab] = useState<"products" | "shops">("products");
  const [showFilters, setShowFilters] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const [sort, setSort] = useState("popular");

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Category[]>("/categories")
      .then((res) => setCategories(res.filter((c) => c.productCount > 0)))
      .catch(() => setCategories([]));
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
      if (selectedCities.length) params.set("cities", selectedCities.join(","));

      if (tab === "products") {
        params.set("sort", sort);
        if (category) params.set("category", category);
        if (minRating) params.set("minRating", String(minRating));
        if (inStockOnly) params.set("inStockOnly", "true");
        if (priceRange.min) params.set("minPrice", priceRange.min);
        if (priceRange.max) params.set("maxPrice", priceRange.max);

        const res = await apiFetch<{ items: CatalogProduct[]; meta: { total: number } }>(
          `/catalog/products?${params.toString()}`,
        );
        setProducts(res.items || []);
        setTotal(res.meta?.total ?? res.items?.length ?? 0);
      } else {
        // La liste des boutiques ne connaît qu'une ville à la fois côté API.
        if (selectedCities.length === 1) params.set("city", selectedCities[0]);
        params.delete("cities");

        const res = await apiFetch<{ items: PublicShop[]; meta: { total: number } }>(
          `/shops/public?${params.toString()}`,
        );
        setShops(res.items || []);
        setTotal(res.meta?.total ?? res.items?.length ?? 0);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [tab, search, category, selectedCities, minRating, inStockOnly, priceRange, sort, t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCity = (city: string, checked: boolean) => {
    setSelectedCities((prev) => (checked ? [...prev, city] : prev.filter((c) => c !== city)));
  };

  const applyPrice = () => {
    setPriceRange({ min: minPriceInput.trim(), max: maxPriceInput.trim() });
  };

  const clearAll = () => {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setSelectedCities([]);
    setMinRating(null);
    setInStockOnly(false);
    setMinPriceInput("");
    setMaxPriceInput("");
    setPriceRange({ min: "", max: "" });
  };

  const activeCategory = categories.find((c) => c.slug === category);
  const hasPriceFilter = Boolean(priceRange.min || priceRange.max);
  const activeCount =
    selectedCities.length +
    (category ? 1 : 0) +
    (minRating ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (hasPriceFilter ? 1 : 0);

  const priceLabel = () => {
    if (priceRange.min && priceRange.max) {
      return `${formatPrice(Number(priceRange.min))} – ${formatPrice(Number(priceRange.max))}`;
    }
    if (priceRange.min) return t("priceFrom", { price: formatPrice(Number(priceRange.min)) });
    return t("priceUpTo", { price: formatPrice(Number(priceRange.max)) });
  };

  const filters = (
    <>
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
              checked={selectedCities.includes(c)}
              onChange={(checked) => toggleCity(c, checked)}
            />
          ))}
        </FilterSection>
      )}

      {tab === "products" && (
        <>
          {categories.length > 0 && (
            <FilterSection title={t("category")}>
              {categories.map((c) => (
                <FilterCheckbox
                  key={c.id}
                  label={c.name}
                  count={c.productCount}
                  checked={category === c.slug}
                  onChange={(checked) => setCategory(checked ? c.slug : "")}
                />
              ))}
            </FilterSection>
          )}

          <FilterSection title={t("priceRange")}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                placeholder={t("priceMin")}
                className="h-9 text-sm"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                placeholder={t("priceMax")}
                className="h-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={applyPrice}>
              {t("applyPrice")}
            </Button>
          </FilterSection>

          <FilterSection title={t("rating")}>
            {RATING_FILTERS.map((value) => (
              <label key={value} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="minRating"
                  checked={minRating === value}
                  onChange={() => setMinRating(value)}
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
                <RatingStars rating={value} />
                <span className="text-muted-foreground">{t("andAbove")}</span>
              </label>
            ))}
            {minRating && (
              <button
                type="button"
                onClick={() => setMinRating(null)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("resetRating")}
              </button>
            )}
          </FilterSection>

          <FilterSection title={t("availability")}>
            <FilterCheckbox
              label={t("inStockOnly")}
              checked={inStockOnly}
              onChange={setInStockOnly}
            />
          </FilterSection>
        </>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Barre de recherche */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="h-11 pl-9 pr-9"
            placeholder={t("searchPlaceholder")}
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

      {/* Raccourcis de catégories */}
      {categories.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !category
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {t("allCategories")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.slug)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === c.slug
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 lg:grid lg:grid-cols-[232px_1fr] lg:gap-7">
        {/* Sidebar de filtres */}
        <aside
          className={cn(
            "mb-5 rounded-xl border border-border bg-card p-4 lg:mb-0 lg:self-start lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0",
            !showFilters && "hidden lg:block",
          )}
        >
          {filters}
        </aside>

        <div>
          {/* Onglets + tri */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setTab("products")}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  tab === "products"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t("tabProducts")}
              </button>
              <button
                type="button"
                onClick={() => setTab("shops")}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  tab === "shops"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t("tabShops")}
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 lg:hidden"
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

            {tab === "products" && (
              <label className="ml-auto flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("sortBy")}</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="popular">{t("sortPopular")}</option>
                  <option value="rating">{t("sortRating")}</option>
                  <option value="recent">{t("sortRecent")}</option>
                  <option value="price_asc">{t("sortPriceAsc")}</option>
                  <option value="price_desc">{t("sortPriceDesc")}</option>
                </select>
              </label>
            )}
          </div>

          {/* Compteur de résultats + filtres actifs */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {search
                ? t("resultsCountFor", { count: total, query: search })
                : t("resultsCount", { count: total })}
            </p>

            {activeCategory && (
              <FilterChip label={activeCategory.name} onRemove={() => setCategory("")} />
            )}
            {selectedCities.map((c) => (
              <FilterChip key={c} label={c} onRemove={() => toggleCity(c, false)} />
            ))}
            {hasPriceFilter && (
              <FilterChip
                label={priceLabel()}
                onRemove={() => {
                  setMinPriceInput("");
                  setMaxPriceInput("");
                  setPriceRange({ min: "", max: "" });
                }}
              />
            )}
            {minRating != null && (
              <FilterChip
                label={t("ratingChip", { rating: minRating })}
                onRemove={() => setMinRating(null)}
              />
            )}
            {inStockOnly && (
              <FilterChip label={t("inStockOnly")} onRemove={() => setInStockOnly(false)} />
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Résultats */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tab === "products" ? (
            products.length === 0 ? (
              <EmptyState
                message={t("noResults")}
                onReset={activeCount > 0 ? clearAll : undefined}
                resetLabel={t("clearAll")}
              />
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={() =>
                      addItem({
                        productId: product.id,
                        name: product.name,
                        slug: product.slug,
                        price: product.price,
                        unit: product.unit,
                        quantity: 1,
                        image: product.images?.[0],
                        shop: product.shop,
                      })
                    }
                  />
                ))}
              </div>
            )
          ) : shops.length === 0 ? (
            <EmptyState
              message={t("noShops")}
              onReset={activeCount > 0 ? clearAll : undefined}
              resetLabel={t("clearAll")}
            />
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

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-primary/20"
        aria-label={`${label} ✕`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function EmptyState({
  message,
  onReset,
  resetLabel,
}: {
  message: string;
  onReset?: () => void;
  resetLabel: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border bg-card py-16 text-center">
      <p className="font-medium text-card-foreground">{message}</p>
      {onReset && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>
          {resetLabel}
        </Button>
      )}
    </div>
  );
}
