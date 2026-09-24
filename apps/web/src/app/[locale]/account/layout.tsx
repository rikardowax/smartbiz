"use client";

import { Bell, Heart, LogOut, Settings, ShieldCheck, ShoppingBag, Store, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const menuItems = [
  { href: "/account/profile", icon: User, key: "profile" },
  { href: "/account/orders", icon: ShoppingBag, key: "orders" },
  { href: "/account/favorites", icon: Heart, key: "favorites" },
  { href: "/account/notifications", icon: Bell, key: "notifications" },
  { href: "/account/settings", icon: Settings, key: "settings" },
] as const;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("account");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore
      }
    }
    logout();
    window.location.href = "/";
  };

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:gap-8">
      <aside className="w-full shrink-0 md:w-60">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {initials || <User className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-card-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.phone}</p>
            </div>
          </div>

          <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{t(item.key)}</span>
                </Link>
              );
            })}

            {user?.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="whitespace-nowrap">{tNav("admin")}</span>
              </Link>
            ) : user?.role === "VENDEUR" ? (
              <Link
                href="/dashboard"
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Store className="h-4 w-4" />
                <span className="whitespace-nowrap">{t("myShop")}</span>
              </Link>
            ) : (
              <Link
                href="/become-seller"
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Store className="h-4 w-4" />
                <span className="whitespace-nowrap">{t("openShop")}</span>
              </Link>
            )}

            <Link
              href="/cart"
              className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="whitespace-nowrap">{t("myOrders")}</span>
            </Link>
          </nav>

          <div className="mt-3 border-t border-border/60 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-muted-foreground hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
