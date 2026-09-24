"use client";

import { ChevronRight, LogOut, Menu, Moon, ShoppingCart, Store, Sun, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCartAnimation } from "@/components/add-to-cart-animation";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";

export function Header({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const otherLocale = locale === "fr" ? "en" : "fr";
  const { isAuthenticated, user, logout } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const { cartIconRef, cartIconMobileRef } = useCartAnimation();
  const [cartBounce, setCartBounce] = useState(false);

  // Bounce the cart icon whenever cart count changes
  const prevCount = useRef(cartCount);
  useEffect(() => {
    if (cartCount > prevCount.current) {
      setCartBounce(true);
      const timer = setTimeout(() => setCartBounce(false), 400);
      return () => clearTimeout(timer);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Le menu plein écran se referme dès que la route change ou que la
  // session bascule : connexion, inscription et déconnexion ferment le menu.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, isAuthenticated]);

  // Scroll verrouillé + fermeture par Échap tant que le menu est ouvert.
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const isAdmin = user?.role === "ADMIN";
  const isSeller = user?.role === "VENDEUR" || isAdmin;
  const showCart = !isSeller;

  const buyerLinks = [
    { href: "/marketplace", label: t("products") },
    { href: "/shops", label: t("shops") },
  ];

  const sellerLinks = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/dashboard/shops", label: t("myShops") },
    ...(isSeller ? [{ href: "/salesbot", label: t("salesbot") }] : []),
  ];

  const links = isAdmin
    ? [...buyerLinks, { href: "/admin", label: t("admin") }]
    : isAuthenticated && isSeller
      ? [...buyerLinks, ...sellerLinks]
      : buyerLinks;

  const handleLogout = async () => {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore network errors on logout
      }
    }
    logout();
    window.location.href = "/";
  };

  const initials =
    user && (user.firstName || user.lastName)
      ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
      : (user?.phone.slice(-2).toUpperCase() ?? "");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold text-brand-gradient">SmartBiz</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <PwaInstallButton />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <button
            type="button"
            onClick={() => router.replace(pathname, { locale: otherLocale })}
            className="text-sm font-medium uppercase text-muted-foreground hover:text-foreground"
          >
            {otherLocale}
          </button>

          {mounted && isAuthenticated ? (
            <div className="flex items-center gap-2">
              {showCart && (
                <Link
                  href="/cart"
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    cartBounce && "animate-[cart-bounce_0.4s_ease]",
                  )}
                  ref={cartIconRef as React.Ref<HTMLAnchorElement>}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Link>
              )}

              {!isSeller && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/become-seller">{t("becomeSeller")}</Link>
                </Button>
              )}

              <Link
                href="/account/profile"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-80"
              >
                {initials || <User className="h-4 w-4" />}
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                {t("logout")}
              </Button>
            </div>
          ) : (
            <>
              {showCart && (
                <Link
                  href="/cart"
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    cartBounce && "animate-[cart-bounce_0.4s_ease]",
                  )}
                  ref={cartIconRef as React.Ref<HTMLAnchorElement>}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Link>
              )}

              <Button asChild variant="outline" size="sm">
                <Link href="/login">{t("login")}</Link>
              </Button>

              <Button asChild size="sm">
                <Link href="/register">{t("register")}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <PwaInstallButton />
          {showCart && (
            <Link
              href="/cart"
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                cartBounce && "animate-[cart-bounce_0.4s_ease]",
              )}
              ref={cartIconMobileRef as React.Ref<HTMLAnchorElement>}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 dark:hidden" />
            <Moon className="hidden h-5 w-5 dark:block" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Portal : le header a backdrop-blur, ce qui crée un containing block
          et empêcherait un descendant `fixed` de couvrir tout le viewport. */}
      {mounted &&
        mobileOpen &&
        createPortal(
          <div className="animate-in fade-in slide-in-from-top-4 fixed inset-0 z-[70] flex flex-col bg-background duration-300 md:hidden">
            {/* Barre supérieure du menu */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-4">
              <Link
                href="/"
                className="flex items-center gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow">
                  <Store className="h-5 w-5" />
                </div>
                <span className="text-xl font-extrabold text-brand-gradient">SmartBiz</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Liens principaux, grandes zones tactiles */}
            <nav className="animate-slide-in-stagger flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-6">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-4 text-xl font-bold transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent",
                    )}
                  >
                    {link.label}
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 transition-transform",
                        active ? "text-primary" : "text-muted-foreground/40",
                      )}
                    />
                  </Link>
                );
              })}

              <div className="my-4 border-t border-border/60" />

              {mounted && isAuthenticated ? (
                <>
                  {/* Carte utilisateur */}
                  <Link
                    href="/account/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {initials || <User className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-foreground">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user?.phone}
                      </span>
                    </span>
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/50" />
                  </Link>

                  {!isSeller && (
                    <Button asChild variant="outline" size="lg" className="mt-3 w-full rounded-2xl">
                      <Link href="/become-seller">{t("becomeSeller")}</Link>
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleLogout}
                    className="mt-3 w-full rounded-2xl"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("logout")}
                  </Button>
                </>
              ) : (
                <div className="mt-1 flex flex-col gap-3">
                  <Button asChild variant="outline" size="lg" className="w-full rounded-2xl">
                    <Link href="/login">{t("login")}</Link>
                  </Button>
                  <Button asChild size="lg" className="w-full rounded-2xl">
                    <Link href="/register">{t("register")}</Link>
                  </Button>
                </div>
              )}
            </nav>

            {/* Barre d'actions rapides en bas */}
            <div className="flex shrink-0 items-center justify-center gap-6 border-t border-border/60 px-4 py-4">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex flex-col items-center gap-1 text-muted-foreground"
                aria-label="Toggle theme"
              >
                <Sun className="h-5 w-5 dark:hidden" />
                <Moon className="hidden h-5 w-5 dark:block" />
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  {theme === "dark" ? "Light" : "Dark"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.replace(pathname, { locale: otherLocale })}
                className="flex flex-col items-center gap-1 text-muted-foreground"
              >
                <span className="flex h-5 items-center text-sm font-bold uppercase">
                  {otherLocale}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide">Langue</span>
              </button>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}
