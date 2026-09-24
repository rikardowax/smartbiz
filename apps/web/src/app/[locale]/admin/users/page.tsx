"use client";

import { Loader2, Search, Store, Trash2, UserCheck, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ActiveBadge, RoleBadge, ShopStatusBadge } from "@/components/admin/badges";
import { ConfirmDialog, type ConfirmRequest } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

interface AdminUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  role: "ADMIN" | "VENDEUR" | "ACHETEUR";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  shops: { id: string; name: string; slug: string; status: string }[];
  _count: { orders: number };
}

interface Paginated<T> {
  items: T[];
  meta: { total: number; totalPages: number; page: number };
}

const ROLE_FILTERS = ["", "ACHETEUR", "VENDEUR", "ADMIN"] as const;
const ACTIVE_FILTERS = ["", "true", "false"] as const;

export default function AdminUsersPage() {
  const t = useTranslations("admin");
  const me = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
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
      if (role) params.set("role", role);
      if (active) params.set("isActive", active);
      const res = await apiFetch<Paginated<AdminUser>>(`/admin/users?${params}`);
      setUsers(res.items);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [page, search, role, active, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetchKey sert de signal de rechargement après une mutation
  useEffect(() => {
    load();
  }, [load, refetchKey]);

  const toggleActive = (user: AdminUser) => {
    setBusy(user.id);
    apiFetch(`/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !user.isActive }),
    })
      .then(() => {
        toast.success(user.isActive ? t("userDisabled") : t("userEnabled"));
        setRefetchKey((k) => k + 1);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : t("error")))
      .finally(() => setBusy(null));
  };

  const changeRole = (user: AdminUser, nextRole: string) => {
    if (nextRole === user.role) return;
    setBusy(user.id);
    apiFetch(`/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role: nextRole }),
    })
      .then(() => {
        toast.success(t("roleUpdated"));
        setRefetchKey((k) => k + 1);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : t("error")))
      .finally(() => setBusy(null));
  };

  const askDelete = (user: AdminUser) => {
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.phone;
    const consequences = [
      user.shops.length > 0 &&
        t("deleteUserShops", {
          count: user.shops.length,
          shops: user.shops.map((s) => s.name).join(", "),
        }),
      user._count.orders > 0 && t("deleteUserOrders", { count: user._count.orders }),
    ].filter(Boolean) as string[];

    setConfirm({
      title: t("deleteUserTitle", { name }),
      description: t("deleteUserDescription"),
      consequences,
      confirmLabel: t("deleteForever"),
      requireTyped: name,
      onConfirm: async () => {
        await apiFetch(`/admin/users/${user.id}`, { method: "DELETE" });
        toast.success(t("userDeleted"));
        setRefetchKey((k) => k + 1);
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("usersTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("usersSubtitle", { count: total })}</p>
        </div>
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
            placeholder={t("searchUsers")}
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
          {ROLE_FILTERS.map((value) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setPage(1);
                setRole(value);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                role === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value ? t(`role${value}`) : t("allRoles")}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border/60 bg-card p-0.5">
          {ACTIVE_FILTERS.map((value) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setPage(1);
                setActive(value);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                active === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value === ""
                ? t("allStates")
                : value === "true"
                  ? t("statusActive")
                  : t("statusDisabled")}
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
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t("noUsers")}
          </CardContent>
        </Card>
      ) : (
        <div className="animate-grid-in space-y-3">
          {users.map((user) => {
            const isSelf = user.id === me?.id;
            const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.phone;
            return (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-40 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-card-foreground">{name}</p>
                      <RoleBadge role={user.role} />
                      <ActiveBadge active={user.isActive} />
                      {isSelf && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          {t("you")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {user.phone}
                      {user.email ? ` · ${user.email}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {t("registeredAt", {
                          date: new Date(user.createdAt).toLocaleDateString(),
                        })}
                      </span>
                      {user.shops.map((shop) => (
                        <span
                          key={shop.id}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5"
                        >
                          <Store className="h-3 w-3" />
                          {shop.name}
                          <ShopStatusBadge status={shop.status} />
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value)}
                      disabled={busy === user.id || isSelf}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t("changeRole")}
                    >
                      <option value="ACHETEUR">{t("roleACHETEUR")}</option>
                      <option value="VENDEUR">{t("roleVENDEUR")}</option>
                      <option value="ADMIN">{t("roleADMIN")}</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(user)}
                      disabled={busy === user.id || isSelf}
                    >
                      {busy === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.isActive ? (
                        <UserX className="mr-1.5 h-4 w-4" />
                      ) : (
                        <UserCheck className="mr-1.5 h-4 w-4" />
                      )}
                      {user.isActive ? t("disable") : t("enable")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => askDelete(user)}
                      disabled={busy === user.id || isSelf}
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
