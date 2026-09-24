"use client";

import { LayoutDashboard, Package, ShieldCheck, Store, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const icons = { LayoutDashboard, Users, Store, Package };

/**
 * Coquille de l'espace d'administration. Volontairement distincte de
 * `SellerLayout` : l'accent violet signale en permanence qu'on agit sur toute
 * la plateforme et non sur une boutique.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  const menu = [
    { href: "/admin", icon: "LayoutDashboard" as const, label: t("overview") },
    { href: "/admin/users", icon: "Users" as const, label: t("users") },
    { href: "/admin/shops", icon: "Store" as const, label: t("shops") },
    { href: "/admin/products", icon: "Package" as const, label: t("products") },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-border bg-card md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-bold text-card-foreground">{t("title")}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {t("subtitle")}
            </span>
          </div>
        </div>
        <nav className="flex flex-row gap-0.5 overflow-x-auto p-2 md:flex-col md:p-3">
          {menu.map((item) => {
            const Icon = icons[item.icon];
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 bg-secondary/20 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
