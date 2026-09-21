"use client";

import {
  ArrowRight,
  BarChart3,
  Bot,
  ChevronRight,
  Loader2,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, hl, sh] = await Promise.all([
          apiFetch<Category[]>("/catalog/categories"),
          apiFetch<Highlights>("/catalog/highlights"),
          apiFetch<{ items: PublicShop[] }>("/shops/public?limit=6"),
        ]);
        setCategories(cats);
        setHighlights(hl);
        setShops(sh.items ?? []);
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
      <section className="relative overflow-hidden bg-brand-gradient pt-16 pb-20 lg:pt-24 lg:pb-32">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.3)_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="animate-fade-in-up text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl animate-fade-in-up text-base text-white/80 sm:text-lg">
            {t("subtitle")}
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 flex max-w-xl animate-fade-in-up items-center gap-2 rounded-xl bg-white/95 p-1.5 shadow-xl backdrop-blur-sm"
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

          <div className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-in-up">
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
              <Link href="/register">{t("ctaSeller")}</Link>
            </Button>
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
            <Link href="/register">
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
