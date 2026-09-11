"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useShopList } from "@/hooks/use-shop-list";
import { cn } from "@/lib/utils";

export interface SimpleListColumn<T> {
  label: string;
  accessor: (item: T) => string | number;
  className?: string;
}

export function SimpleList<T extends { id: string }>({
  path,
  title,
  columns,
  refetchKey = 0,
}: {
  path: string;
  title: string;
  columns: SimpleListColumn<T>[];
  refetchKey?: number;
}) {
  const t = useTranslations("erp");
  const { items, loading, error } = useShopList<T>(path, refetchKey);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-lg font-medium text-card-foreground">{t("noResults")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.label}
                    className={cn(
                      "px-4 py-3 text-left font-semibold text-muted-foreground",
                      col.className,
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/30">
                  {columns.map((col) => (
                    <td
                      key={col.label}
                      className={cn("px-4 py-3 text-card-foreground", col.className)}
                    >
                      {col.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
