"use client";

import { Bot, ShoppingBag, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user } = useAuthStore();

  const displayName =
    user && (user.firstName || user.lastName)
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : (user?.phone ?? "");

  const isSeller = user?.role === "VENDEUR";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-brand-gradient p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">{t("welcome", { name: displayName })}</h1>
        <p className="mt-2 text-primary-foreground/90">
          {isSeller ? t("subtitleSeller") : t("subtitleBuyer")}
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          icon={ShoppingBag}
          title="Marketplace"
          description="Parcourez et commandez des produits."
          href="/marketplace"
          cta={t("exploreMarketplace")}
        />
        <ActionCard
          icon={Bot}
          title="Assistant"
          description="Posez vos questions à l'assistant intelligent."
          href="/assistant"
          cta={t("openAssistant")}
        />
        {isSeller && (
          <ActionCard
            icon={Store}
            title={t("shops")}
            description={
              user?.shops && user.shops.length > 0
                ? user.shops.map((s) => s.name).join(", ")
                : t("noShops")
            }
            href="/dashboard"
            cta="—"
          />
        )}
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{description}</p>
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}
