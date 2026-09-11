"use client";

import { Download, Share2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { usePwaInstall } from "@/components/pwa-install-context";
import { Button } from "@/components/ui/button";

export function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      "standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone;
    setIsIos(isIosDevice && !isStandalone);
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setDismissed(true);
  };

  if (dismissed) return null;
  if (!canInstall && !isIos) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        {canInstall ? (
          <Download className="mt-0.5 h-5 w-5 text-primary" />
        ) : (
          <Share2 className="mt-0.5 h-5 w-5 text-primary" />
        )}
        <div className="flex-1">
          <p className="font-semibold text-foreground">{t("installTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {canInstall ? t("installDescription") : t("iosHint")}
          </p>
        </div>
        <div className="flex gap-2">
          {canInstall && (
            <Button type="button" size="sm" onClick={handleInstall}>
              {t("install")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            aria-label={t("dismiss")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
