"use client";

import { Bot } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Lien vers le SalesBot WhatsApp de la plateforme. Un numéro unique sert toutes
 * les boutiques : le slug envoyé dans le premier message indique au bot quel
 * catalogue ouvrir.
 */
export function SalesbotLink({
  shopSlug,
  className,
  size,
  iconOnly = false,
}: {
  shopSlug: string;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  iconOnly?: boolean;
}) {
  const t = useTranslations("salesbot");
  const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER;

  if (!botNumber) return null;

  const href = `https://wa.me/${botNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
    `boutique:${shopSlug}`,
  )}`;

  return (
    <Button
      asChild
      size={size}
      className={`gap-2 bg-[#25D366] text-white hover:bg-[#128C7E] ${className ?? ""}`}
    >
      <a href={href} target="_blank" rel="noopener noreferrer" title={t("orderViaBot")}>
        <Bot className="h-4 w-4" />
        {!iconOnly && t("orderViaBot")}
      </a>
    </Button>
  );
}
