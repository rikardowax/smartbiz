"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { usePwaInstall } from "@/components/pwa-install-context";
import { Button } from "@/components/ui/button";

export function PwaInstallButton() {
  const t = useTranslations("pwa");
  const { canInstall, promptInstall } = usePwaInstall();

  const handleClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) toast.success(t("installTitle"));
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      toast.info(t("iosHint"), { duration: 6000 });
    } else {
      toast.info(t("installDescription"), { duration: 6000 });
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={handleClick}
      aria-label={t("installTitle")}
      title={t("installTitle")}
    >
      <Download className="h-5 w-5" />
    </Button>
  );
}
