"use client";

import {
  AlertTriangle,
  Loader2,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RoleBadge, ShopStatusBadge } from "@/components/admin/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

interface PlatformStats {
  users: { total: number; admins: number; sellers: number; buyers: number; newToday: number };
  shops: { total: number; active: number; pending: number; suspended: number };
  products: { total: number; active: number };
  orders: { total: number; month: number; monthRevenue: number; grossMerchandiseValue: number };
}

interface TrendPoint {
  date: string;
  signups: number;
  orders: number;
  revenue: number;
}

interface Activity {
  recentUsers: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string;
    role: string;
    createdAt: string;
  }[];
  recentShops: {
    id: string;
    name: string;
    city: string;
    status: string;
    createdAt: string;
    owner: { firstName: string | null; lastName: string | null };
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    placedAt: string;
    shop: { name: string };
  }[];
}

export default function AdminOverviewPage() {
  const t = useTranslations("admin");
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [s, tr, act] = await Promise.all([
          apiFetch<PlatformStats>("/admin/stats"),
          apiFetch<TrendPoint[]>("/admin/trend?days=30"),
          apiFetch<Activity>("/admin/activity"),
        ]);
        setStats(s);
        setTrend(tr);
        setActivity(act);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("error"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error || t("error")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("greeting", { name: user?.firstName ?? "" })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("greetingSub")}</p>
      </div>

      <div className="animate-grid-in grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          iconBg="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
          title={t("totalUsers")}
          value={stats.users.total.toLocaleString()}
          hint={t("usersBreakdown", {
            sellers: stats.users.sellers,
            buyers: stats.users.buyers,
          })}
          href="/admin/users"
        />
        <StatCard
          icon={Store}
          iconBg="bg-primary/10 text-primary"
          title={t("totalShops")}
          value={stats.shops.total.toLocaleString()}
          hint={t("shopsBreakdown", {
            active: stats.shops.active,
            suspended: stats.shops.suspended,
          })}
          href="/admin/shops"
        />
        <StatCard
          icon={Package}
          iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
          title={t("totalProducts")}
          value={stats.products.total.toLocaleString()}
          hint={t("productsBreakdown", { active: stats.products.active })}
          href="/admin/products"
        />
        <StatCard
          icon={ShoppingCart}
          iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
          title={t("totalOrders")}
          value={stats.orders.total.toLocaleString()}
          hint={t("ordersBreakdown", { month: stats.orders.month })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">{t("gmv")}</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular">
              {formatPrice(stats.orders.grossMerchandiseValue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("gmvHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">{t("monthRevenue")}</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular">
              {formatPrice(stats.orders.monthRevenue)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              {t("ordersThisMonth", { count: stats.orders.month })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">{t("newUsersToday")}</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular">
              {stats.users.newToday}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <UserPlus className="h-3 w-3" />
              {t("adminCount", { count: stats.users.admins })}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.shops.pending > 0 && (
        <Link
          href="/admin/shops"
          className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 transition-colors hover:bg-warning/20"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("pendingShops", { count: stats.shops.pending })}
            </p>
            <p className="text-xs text-muted-foreground">{t("pendingShopsHint")}</p>
          </div>
        </Link>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
            {t("platformTrend")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="adminSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                  }
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    boxShadow: "0 4px 12px rgb(0 0 0 / 0.1)",
                  }}
                  labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  name={t("signups")}
                  dataKey="signups"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#adminSignups)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  name={t("orders")}
                  dataKey="orders"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {activity && (
        <div className="grid gap-4 lg:grid-cols-3">
          <ActivityCard
            title={t("recentUsers")}
            empty={activity.recentUsers.length === 0}
            emptyLabel={t("noData")}
          >
            {activity.recentUsers.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {`${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() || item.phone}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{item.phone}</p>
                </div>
                <RoleBadge role={item.role} />
              </li>
            ))}
          </ActivityCard>

          <ActivityCard
            title={t("recentShops")}
            empty={activity.recentShops.length === 0}
            emptyLabel={t("noData")}
          >
            {activity.recentShops.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.city} ·{" "}
                    {`${item.owner.firstName ?? ""} ${item.owner.lastName ?? ""}`.trim()}
                  </p>
                </div>
                <ShopStatusBadge status={item.status} />
              </li>
            ))}
          </ActivityCard>

          <ActivityCard
            title={t("recentOrders")}
            empty={activity.recentOrders.length === 0}
            emptyLabel={t("noData")}
          >
            {activity.recentOrders.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {item.orderNumber}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{item.shop.name}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground tabular">
                  {formatPrice(item.total)}
                </span>
              </li>
            ))}
          </ActivityCard>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  title,
  value,
  hint,
  href,
}: {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <Card className="hover-lift group h-full hover:shadow-lg">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]",
            iconBg,
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-2xl font-bold text-card-foreground tabular">{value}</p>
          {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function ActivityCard({
  title,
  empty,
  emptyLabel,
  children,
}: {
  title: string;
  empty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="divide-y divide-border/60">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}
