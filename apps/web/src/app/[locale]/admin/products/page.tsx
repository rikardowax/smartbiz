"use client";

import { Loader2, Package, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductStatusBadge } from "@/components/admin/badges";
import { ConfirmDialog, type ConfirmRequest } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  stockQuantity: number;
  status: string;
  images: string[];
  createdAt: string;
  shop: { id: string; name: string; slug: string };
  category: { id: string; name: string } | null;
  _count: { orderItems: number };
}

interface Paginated<T> {
  items: T[];
  meta: { total: number; totalPages: number; page: number };
}

const STATUS_FILTERS = ["", "ACTIVE", "DRAFT", "ARCHIVED"] as const;

export default function AdminProductsPage() {
  const t = useTranslations("admin");

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "15", page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const res = await apiFetch<Paginated<AdminProduct>>(`/admin/products?${params}`);
      setProducts(res.items);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetchKey sert de signal de rechargement après une suppression
  useEffect(() => {
    load();
  }, [load, refetchKey]);

  const askDelete = (product: AdminProduct) => {
    const willArchive = product._count.orderItems > 0;
    setConfirm({
      title: t("deleteProductTitle", { name: product.name }),
      description: willArchive ? t("deleteProductArchive") : t("deleteProductDescription"),
      consequences: [
        t("deleteProductShop", { shop: product.shop.name }),
        willArchive ? t("deleteProductOrdered", { count: product._count.orderItems }) : null,
      ].filter(Boolean) as string[],
      confirmLabel: willArchive ? t("archive") : t("deleteForever"),
      onConfirm: async () => {
        const res = await apiFetch<{ archived?: boolean }>(`/admin/products/${product.id}`, {
          method: "DELETE",
        });
        toast.success(res.archived ? t("productArchived") : t("productDeleted"));
        setRefetchKey((k) => k + 1);
      },
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("productsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("productsSubtitle", { count: total })}</p>
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
            placeholder={t("searchProducts")}
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
              {value ? t(`productStatus${value}`) : t("allStatuses")}
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
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
            <Package className="h-8 w-8" />
            {t("noProducts")}
          </CardContent>
        </Card>
      ) : (
        <div className="animate-grid-in space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                  {product.images[0] ? (
                    // biome-ignore lint/performance/noImgElement: miniatures de catalogues hébergés par les vendeurs
                    <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-40 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-card-foreground">{product.name}</p>
                    <ProductStatusBadge status={product.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {product.shop.name}
                    {product.category ? ` · ${product.category.name}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("productStats", {
                      price: formatPrice(product.price),
                      stock: product.stockQuantity,
                      ordered: product._count.orderItems,
                    })}
                  </p>
                </div>

                <Button variant="destructive" size="sm" onClick={() => askDelete(product)}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {product._count.orderItems > 0 ? t("archive") : t("delete")}
                </Button>
              </CardContent>
            </Card>
          ))}
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
