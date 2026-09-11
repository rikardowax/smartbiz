"use client";

import {
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
      <aside className="w-full border-b border-border bg-card p-3 md:w-64 md:border-b-0 md:border-r md:p-4">
        <div className="mb-4 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="h-4 w-4" />
          </div>
          <span className="line-clamp-1 font-semibold text-card-foreground">{shopName}</span>
        </div>
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
          {menu.map((item) => {
            const Icon = icons[item.icon];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
