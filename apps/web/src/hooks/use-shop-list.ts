"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";

export function useShopList<T>(path: string) {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<{ items: T[] }>(`/shops/${shopId}${path}`)
      .then((res) => {
        if (!cancelled) setItems(res.items || []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shopId, path, t]);

  return { items, loading, error };
}
