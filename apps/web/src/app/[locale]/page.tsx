import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ShoppingBag,
  BarChart3,
  Bot,
  MessageCircle,
  Smartphone,
} from "lucide-react";

type PageParams = Promise<{ locale: string }>;

export default async function HomePage({ params }: { params: PageParams }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  return (
    <>
      <section className="relative overflow-hidden bg-secondary/30 pt-16 pb-24 lg:pt-28 lg:pb-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent-foreground">
                <ShoppingBag className="mr-1.5 h-4 w-4" />
                Marketplace + ERP
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {t("title")}
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                {t("subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg">
                  <Link href="/marketplace">
                    {t("ctaBuyer")}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/register">{t("ctaSeller")}</Link>
                </Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-2xl ring-1 ring-border/40">
                <Image
                  src="https://picsum.photos/seed/smartbiz/800/600"
                  alt="SmartBiz"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={ShoppingBag}
              title={locale === "fr" ? "Marketplace" : "Marketplace"}
              description={
                locale === "fr"
                  ? "Découvrez des produits auprès de vendeurs locaux et passez commande en quelques clics."
                  : "Discover products from local sellers and order in a few clicks."
              }
            />
            <FeatureCard
              icon={BarChart3}
              title={locale === "fr" ? "ERP simplifié" : "Simple ERP"}
              description={
                locale === "fr"
                  ? "Stocks, commandes, clients, fournisseurs et finances dans un seul tableau de bord."
                  : "Stocks, orders, customers, suppliers and finances in one dashboard."
              }
            />
            <FeatureCard
              icon={Bot}
              title={locale === "fr" ? "Assistant IA" : "AI Assistant"}
              description={
                locale === "fr"
                  ? "Posez vos questions, obtenez des analyses et laissez l'assistant vous aider au quotidien."
                  : "Ask questions, get insights and let the assistant help your day-to-day."
              }
            />
            <FeatureCard
              icon={MessageCircle}
              title={locale === "fr" ? "SalesBot WhatsApp" : "WhatsApp SalesBot"}
              description={
                locale === "fr"
                  ? "Un simulateur de conversation pour guider vos clients jusqu'à la commande."
                  : "A chat simulator to guide customers all the way to checkout."
              }
            />
            <FeatureCard
              icon={Smartphone}
              title={
                locale === "fr" ? "Conçu pour mobile" : "Built for mobile"
              }
              description={
                locale === "fr"
                  ? "Interface fluide sur téléphone, tablette et ordinateur pour vendre partout."
                  : "A smooth experience on phone, tablet and desktop so you can sell anywhere."
              }
            />
            <FeatureCard
              icon={BarChart3}
              title={locale === "fr" ? "Analyses claires" : "Clear analytics"}
              description={
                locale === "fr"
                  ? "Tendances de vente, stocks faibles et finances en un coup d'oeil."
                  : "Sales trends, low-stock alerts and finances at a glance."
              }
            />
          </div>
        </div>
      </section>
    </>
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
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
