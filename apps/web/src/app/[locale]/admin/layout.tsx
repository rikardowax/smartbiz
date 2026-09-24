"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * L'espace d'administration ne doit pas être découvrable par un vendeur ou un
 * acheteur : hors rôle ADMIN, la route se comporte comme une page inexistante.
 * La véritable barrière reste l'API (RolesGuard renvoie 403), cet écran évite
 * seulement d'exposer l'existence de l'espace.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin");
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // L'état d'authentification est réhydraté côté client : sans cette attente,
  // un administrateur verrait brièvement l'écran « introuvable ».
  if (!mounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-6xl font-extrabold text-muted-foreground/40">404</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t("notFoundTitle")}</h1>
        <p className="mt-2 max-w-md text-muted-foreground">{t("notFoundDescription")}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
