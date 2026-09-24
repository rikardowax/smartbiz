"use client";

import { ExternalLink, Loader2, MapPin, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShopStatusBadge } from "@/components/admin/badges";
import { ConfirmDialog, type ConfirmRequest } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AdminShop {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  status: string;
  logoUrl: string | null;
  createdAt: string;
  owner: { id: string; firstName: string | null; lastName: string | null; phone: string };
  _count: { products: number; orders: number };
}

interface Paginated<T> {
  items: T[];
  meta: { total: number; totalPages: number; page: number };
}

const STATUS_FILTERS = ["", "ACTIVE", "PENDING", "SUSPENDED"] as const;

export default function AdminShopsPage() {
  const t = useTranslations("admin");

  const [shops, setShops] = useState<AdminShop[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "15", page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const res = await apiFetch<Paginated<AdminShop>>(`/admin/shops?${params}`);
      setShops(res.items);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetchKey sert de signal de rechargement après une mutation
  useEffect(() => {
    load();
  }, [load, refetchKey]);

  const changeStatus = (shop: AdminShop, nextStatus: string) => {
    if (nextStatus === shop.status) return;
    setBusy(shop.id);
    apiFetch(`/admin/shops/${shop.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    })
      .then(() => {
        toast.success(t("shopStatusUpdated"));
        setRefetchKey((k) => k + 1);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : t("error")))
      .finally(() => setBusy(null));
  };

  const askDelete = (shop: AdminShop) => {
    setConfirm({
      title: t("deleteShopTitle", { name: shop.name }),
      description: t("deleteShopDescription"),
      consequences: [
        t("deleteShopProducts", { count: shop._count.products }),
        t("deleteShopOrders", { count: shop._count.orders }),
      ],
      confirmLabel: t("deleteForever"),
      requireTyped: shop.name,
      onConfirm: async () => {
        await apiFetch(`/admin/shops/${shop.id}`, { method: "DELETE" });
        toast.success(t("shopDeleted"));
        setRefetchKey((k) => k + 1);
      },
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("shopsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("shopsSubtitle", { count: total })}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setSearch(searchInput);
              }
            }}
            placeholder={t("searchShops")}
            className="h-10 pl-9"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setPage(1);
            setSearch(searchInput);
          }}
        >
          {t("search")}
        </Button>
        <div className="flex rounded-lg border border-border/60 bg-card p-0.5">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setPage(1);
                setStatus(value);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                status === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value ? t(`shopStatus${value}`) : t("allStatuses")}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : shops.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noShops")}
          </CardContent>
        </Card>
      ) : (
        <div className="animate-grid-in space-y-3">
          {shops.map((shop) => {
            const ownerName = `${shop.owner.firstName ?? ""} ${shop.owner.lastName ?? ""}`.trim();
            return (
              <Card key={shop.id} className="overflow-hidden">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-lg font-bold text-primary">
                    {shop.logoUrl ? (
                      // biome-ignore lint/performance/noImgElement: logos hébergés par les vendeurs
                      <img src={shop.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      shop.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-40 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-card-foreground">{shop.name}</p>
                      <ShopStatusBadge status={shop.status} />
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {shop.city}
                      {shop.country ? `, ${shop.country}` : ""} · {ownerName || shop.owner.phone}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("shopStats", {
                        products: shop._count.products,
                        orders: shop._count.orders,
                        date: new Date(shop.createdAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/shops/${shop.slug}`} target="_blank">
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        {t("viewStorefront")}
                      </Link>
                    </Button>
                    <select
                      value={shop.status}
                      onChange={(e) => changeStatus(shop, e.target.value)}
                      disabled={busy === shop.id}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t("changeStatus")}
                    >
                      <option value="ACTIVE">{t("shopStatusACTIVE")}</option>
                      <option value="PENDING">{t("shopStatusPENDING")}</option>
                      <option value="SUSPENDED">{t("shopStatusSUSPENDED")}</option>
                    </select>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => askDelete(shop)}
                      disabled={busy === shop.id}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {t("delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">{t("pageOf", { page, totalPages })}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </Button>
        </div>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
