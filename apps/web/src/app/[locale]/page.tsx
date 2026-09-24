"use client";

import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageCircle,
  Package,
  Search,
  Shield,
  ShoppingBag,
  Smartphone,
  Store,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { type CatalogProduct, ProductCard } from "@/components/product-card";
import { type PublicShop, ShopCard } from "@/components/shop-card";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface Highlights {
  featured: CatalogProduct[];
  bestSellers: CatalogProduct[];
  newest: CatalogProduct[];
}

const CATEGORY_ICONS: Record<string, string> = {
  alimentation: "🥫",
  mode: "👕",
  electronique: "📱",
  maison: "🏠",
  beaute: "💄",
  sante: "💊",
  sport: "⚽",
  education: "📚",
  services: "🔧",
  autres: "📦",
};

function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] ?? "📦";
}

export default function HomePage() {
  const t = useTranslations("hero");
  const tm = useTranslations("marketplace");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [totals, setTotals] = useState({ shops: 0, products: 0 });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Les CTA vendeur s'adaptent à la session : inscription si anonyme,
  // création de boutique si acheteur connecté, ERP si déjà vendeur.
  const isSeller = user?.role === "VENDEUR" || user?.role === "ADMIN";
  const sellerHref =
    mounted && isAuthenticated ? (isSeller ? "/dashboard" : "/become-seller") : "/register";

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, hl, sh, prod] = await Promise.all([
          apiFetch<Category[]>("/catalog/categories"),
          apiFetch<Highlights>("/catalog/highlights"),
          apiFetch<{ items: PublicShop[]; meta: { total: number } }>("/shops/public?limit=6"),
          apiFetch<{ meta: { total: number } }>("/catalog/products?limit=1"),
        ]);
        setCategories(cats);
        setHighlights(hl);
        setShops(sh.items ?? []);
        setTotals({ shops: sh.meta.total, products: prod.meta.total });
      } catch {
        // silently degrade
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-gradient">
        {/* Halos et trame de fond */}
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-emerald-950/40 blur-3xl" />
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:26px_26px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
          {/* Colonne texte */}
          <div className="text-center lg:text-left">
            <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              {t("badge")}
            </span>

            <h1 className="animate-fade-in-up mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[3.4rem] lg:leading-[1.08]">
              {t.rich("title", {
                accent: (chunks) => (
                  <span className="relative inline-block">
                    <span className="relative z-10">{chunks}</span>
                    <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-sm bg-white/25" />
                  </span>
                ),
              })}
            </h1>

            <p className="animate-fade-in-up mx-auto mt-4 max-w-xl text-base text-white/80 sm:text-lg lg:mx-0">
              {t("subtitle")}
            </p>

            <form
              onSubmit={handleSearch}
              className="animate-fade-in-up mx-auto mt-7 flex max-w-xl items-center gap-2 rounded-2xl bg-white/95 p-1.5 shadow-xl backdrop-blur-sm lg:mx-0"
            >
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" size="sm" className="shrink-0 px-5">
                {tm("search")}
              </Button>
            </form>

            <div className="animate-fade-in-up mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/marketplace">
                  {t("ctaBuyer")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href={sellerHref}>{t("ctaSeller")}</Link>
              </Button>
            </div>

            {/* Statistiques réelles de la plateforme */}
            <dl className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 lg:justify-start">
              <div className="flex items-center gap-2.5">
                <Store className="h-4 w-4 text-white/60" />
                <div className="text-left">
                  <dd className="text-lg font-bold leading-none text-white tabular">
                    {loading ? "…" : totals.shops}
                  </dd>
                  <dt className="mt-0.5 text-[11px] uppercase tracking-wide text-white/60">
                    {t("statShopsLabel")}
                  </dt>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Package className="h-4 w-4 text-white/60" />
                <div className="text-left">
                  <dd className="text-lg font-bold leading-none text-white tabular">
                    {loading ? "…" : totals.products}
                  </dd>
                  <dt className="mt-0.5 text-[11px] uppercase tracking-wide text-white/60">
                    {t("statProductsLabel")}
                  </dt>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4 text-white/60" />
                <div className="text-left">
                  <dd className="text-lg font-bold leading-none text-white">24/7</dd>
                  <dt className="mt-0.5 text-[11px] uppercase tracking-wide text-white/60">
                    {t("statWhatsapp")}
                  </dt>
                </div>
              </div>
            </dl>
          </div>

          {/* Mosaïque produit animée */}
          <div className="relative mx-auto hidden h-[26rem] w-full max-w-md lg:block">
            <HeroVisual highlights={highlights} loading={loading} />
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="border-b border-border/60 bg-card py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-card-foreground">{t("categoriesTitle")}</h2>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/marketplace?category=${cat.slug}`}
                  className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-4 py-2 text-sm font-medium text-secondary-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  <span className="text-lg">{getCategoryIcon(cat.slug)}</span>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Popular products */}
      {highlights && highlights.bestSellers.length > 0 && (
        <ProductRow
          title={t("popularTitle")}
          seeAll="/marketplace?sort=popular"
          seeAllLabel={t("seeAll")}
          products={highlights.bestSellers}
        />
      )}

      {/* Shops */}
      {shops.length > 0 && (
        <section className="py-10 lg:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{t("shopsTitle")}</h2>
              <Link
                href="/shops"
                className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
              >
                {t("seeAll")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="animate-grid-in mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shops.slice(0, 6).map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newest products */}
      {highlights && highlights.newest.length > 0 && (
        <ProductRow
          title={t("newestTitle")}
          seeAll="/marketplace?sort=recent"
          seeAllLabel={t("seeAll")}
          products={highlights.newest}
        />
      )}

      {/* Why SmartBiz */}
      <section className="border-t border-border/60 bg-secondary/30 py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            {t("whyTitle")}
          </h2>
          <div className="animate-grid-in mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={ShoppingBag}
              title={t("whyMarketplace")}
              description={t("whyMarketplaceDesc")}
            />
            <FeatureCard icon={Users} title={t("whyContact")} description={t("whyContactDesc")} />
            <FeatureCard icon={Shield} title={t("whyTrust")} description={t("whyTrustDesc")} />
            <FeatureCard icon={Bot} title={t("whyAI")} description={t("whyAIDesc")} />
            <FeatureCard
              icon={Smartphone}
              title={t("whyMobile")}
              description={t("whyMobileDesc")}
            />
            <FeatureCard
              icon={BarChart3}
              title={t("whyAnalytics")}
              description={t("whyAnalyticsDesc")}
            />
          </div>
        </div>
      </section>

      {/* CTA seller */}
      <section className="py-14 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg">
              <Store className="h-8 w-8" />
            </div>
          </div>
          <h2 className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
            {t("sellerCTATitle")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("sellerCTADesc")}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href={sellerHref}>
              {t("sellerCTAButton")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white">
              <Store className="h-4 w-4" />
            </div>
            <span className="font-bold text-brand-gradient">SmartBiz</span>
          </div>
          <p>&copy; {new Date().getFullYear()} SmartBiz</p>
        </div>
      </footer>
    </>
  );
}

/* ─── Sous-composants ─── */

/** Mosaïque animée du hero : vraies cartes produit + confirmation de commande. */
function HeroVisual({ highlights, loading }: { highlights: Highlights | null; loading: boolean }) {
  const t = useTranslations("hero");
  const candidates = [
    ...(highlights?.bestSellers ?? []),
    ...(highlights?.featured ?? []),
    ...(highlights?.newest ?? []),
  ];
  const [main, secondary] = candidates;

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-2xl" />

      {/* Grande carte produit */}
      <div className="animate-float absolute right-0 top-0 w-64 rotate-3 rounded-2xl bg-white p-3 shadow-2xl">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
          {main?.images?.[0] ? (
            // biome-ignore lint/performance/noImgElement: images produits hébergées par les vendeurs
            <img src={main.images[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-primary">
              <Package className="h-10 w-10" />
            </div>
          )}
          {main && (
            <span className="absolute right-2 top-2 rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow tabular">
              {formatPrice(main.price)}
            </span>
          )}
        </div>
        <p className="mt-2 truncate px-1 text-sm font-semibold text-foreground">
          {loading ? "…" : (main?.name ?? "SmartBiz")}
        </p>
        <p className="truncate px-1 pb-1 text-xs text-muted-foreground">
          {main?.shop?.name ?? t("badge")}
        </p>
      </div>

      {/* Confirmation de commande */}
      <div className="animate-float-delayed absolute left-0 top-24 w-56 -rotate-6 rounded-2xl bg-white p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <p className="text-xs font-semibold text-foreground">{t("orderConfirmed")}</p>
        </div>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{main?.name ?? "SmartBiz"}</p>
        {main && (
          <p className="mt-0.5 text-xs font-bold text-foreground tabular">
            {formatPrice(main.price)}
          </p>
        )}
      </div>

      {/* Pilule WhatsApp */}
      <div className="animate-float absolute bottom-24 right-4 flex -rotate-2 items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-lg">
        <MessageCircle className="h-4 w-4 text-[#25D366]" />
        <span className="text-xs font-semibold text-foreground">{t("statWhatsapp")}</span>
      </div>

      {/* Seconde carte produit */}
      {secondary && secondary.id !== main?.id && (
        <div className="animate-float-delayed absolute bottom-0 left-10 w-44 rotate-2 overflow-hidden rounded-2xl bg-white shadow-xl">
          {secondary.images?.[0] && (
            // biome-ignore lint/performance/noImgElement: vignettes produits
            <img src={secondary.images[0]} alt="" className="h-28 w-full object-cover" />
          )}
          <div className="p-3">
            <p className="truncate text-xs font-semibold text-foreground">{secondary.name}</p>
            <p className="text-xs font-bold text-primary tabular">{formatPrice(secondary.price)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRow({
  title,
  seeAll,
  seeAllLabel,
  products,
}: {
  title: string;
  seeAll: string;
  seeAllLabel: string;
  products: CatalogProduct[];
}) {
  return (
    <section className="py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <Link
            href={seeAll}
            className="flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
          >
            {seeAllLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="animate-grid-in mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="hover-lift group rounded-2xl border border-border/60 bg-card p-6 shadow-sm hover:border-primary/30 hover:shadow-lg">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
