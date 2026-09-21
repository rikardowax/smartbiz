"use client";

import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const icons = {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  Truck,
  Wallet,
  BarChart3,
};

export function SellerLayout({
  children,
  shopName,
}: {
  children: React.ReactNode;
  shopName: string;
}) {
  const t = useTranslations("erp");
  const pathname = usePathname();

  const menu = [
    { href: "/dashboard", icon: "LayoutDashboard" as const, label: t("dashboard") },
    { href: "/dashboard/products", icon: "Package" as const, label: t("products") },
    { href: "/dashboard/stock", icon: "Boxes" as const, label: t("stock") },
    { href: "/dashboard/orders", icon: "ShoppingCart" as const, label: t("orders") },
    { href: "/dashboard/customers", icon: "Users" as const, label: t("customers") },
    { href: "/dashboard/suppliers", icon: "Truck" as const, label: t("suppliers") },
    { href: "/dashboard/finance", icon: "Wallet" as const, label: t("finance") },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-border bg-card md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow">
            <Store className="h-5 w-5" />
          </div>
          <span className="line-clamp-1 font-bold text-card-foreground">{shopName}</span>
        </div>
        <nav className="flex flex-row gap-0.5 overflow-x-auto p-2 md:flex-col md:p-3">
          {menu.map((item) => {
            const Icon = icons[item.icon];
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="whitespace-nowrap">{item.label}</span>
                {active && (
                  <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-primary-foreground md:block" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 bg-secondary/20 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
