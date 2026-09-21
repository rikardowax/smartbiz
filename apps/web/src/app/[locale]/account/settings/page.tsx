"use client";

import { Globe, Lock, LogOut, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsPage() {
  const t = useTranslations("account");
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("settingsTitle")}</h1>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h3 className="text-lg font-semibold text-card-foreground">{t("appearance")}</h3>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="text-sm text-foreground">{t("darkMode")}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? t("lightMode") : t("darkMode")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h3 className="text-lg font-semibold text-card-foreground">{t("language")}</h3>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="text-sm text-foreground">{t("currentLanguage")}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.replace(pathname, { locale: "fr" })}
            >
              Fran\u00e7ais
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.replace(pathname, { locale: "en" })}
            >
              English
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6">
        <h3 className="text-lg font-semibold text-card-foreground">{t("security")}</h3>
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <a href="/forgot-password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t("changePassword")}
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-card p-6">
        <h3 className="text-lg font-semibold text-destructive">{t("dangerZone")}</h3>
        <div className="mt-4">
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
