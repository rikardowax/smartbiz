"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  VENDEUR: "bg-primary/10 text-primary",
  ACHETEUR: "bg-secondary text-secondary-foreground",
};

const SHOP_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  PENDING: "bg-warning/20 text-warning-foreground dark:text-warning",
  SUSPENDED: "bg-destructive/10 text-destructive",
};

const PRODUCT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success",
  DRAFT: "bg-secondary text-secondary-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const t = useTranslations("admin");
  return (
    <Badge
      label={t(`role${role}`)}
      className={ROLE_STYLES[role] ?? "bg-secondary text-secondary-foreground"}
    />
  );
}

export function ShopStatusBadge({ status }: { status: string }) {
  const t = useTranslations("admin");
  return (
    <Badge
      label={t(`shopStatus${status}`)}
      className={SHOP_STATUS_STYLES[status] ?? "bg-secondary text-secondary-foreground"}
    />
  );
}

export function ProductStatusBadge({ status }: { status: string }) {
  const t = useTranslations("admin");
  return (
    <Badge
      label={t(`productStatus${status}`)}
      className={PRODUCT_STATUS_STYLES[status] ?? "bg-secondary text-secondary-foreground"}
    />
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  const t = useTranslations("admin");
  return (
    <Badge
      label={active ? t("statusActive") : t("statusDisabled")}
      className={active ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}
    />
  );
}
