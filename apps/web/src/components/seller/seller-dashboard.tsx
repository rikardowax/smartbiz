"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Loader2,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

interface Overview {
  today: { orderCount: number; revenue: number };
  month: {
    orderCount: number;
    revenue: number;
    income: number;
    expense: number;
    profit: number;
  };
  operations: {
    pendingOrders: number;
    unpaidOrderCount: number;
    unpaidAmount: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  catalog: {
    productCount: number;
    customerCount: number;
    stockValue: number;
  };
}

interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export function SellerDashboard() {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shopId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [ov, tr] = await Promise.all([
          apiFetch<Overview>(`/shops/${shopId}/dashboard/overview`),
          apiFetch<TrendPoint[]>(`/shops/${shopId}/dashboard/sales-trend`),
        ]);
        setOverview(ov);
        setTrend(tr);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("error"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shopId, t]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error || t("error")}
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t("greeting", { name: user?.firstName ?? "" })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("greetingSub")}</p>
      </div>

      {/* Key stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
          title={t("productsCount")}
          value={overview.catalog.productCount.toString()}
        />
        <StatCard
          icon={ShoppingCart}
          iconBg="bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
          title={t("todayOrders")}
          value={overview.today.orderCount.toString()}
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
          title={t("pendingOrders")}
          value={overview.operations.pendingOrders.toString()}
          alert={overview.operations.pendingOrders > 0}
        />
        <StatCard
          icon={Users}
          iconBg="bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
          title={t("customersCount")}
          value={overview.catalog.customerCount.toString()}
        />
      </div>

      {/* Sales report + chart */}
      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("salesTrend")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Revenue stats row */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">{t("monthRevenue")}</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular">
                {fmt(overview.month.revenue)} FCFA
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-success">
                <ArrowUp className="h-3 w-3" />
                {t("income")}: {fmt(overview.month.income)} FCFA
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">{t("expense")}</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular">
                {fmt(overview.month.expense)} FCFA
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <ArrowDown className="h-3 w-3" />
                {t("monthProfit")}: {fmt(overview.month.profit)} FCFA
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-secondary/30 p-4">
              <p className="text-xs font-medium text-muted-foreground">{t("stockValue")}</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular">
                {fmt(overview.catalog.stockValue)} FCFA
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Boxes className="h-3 w-3" />
                {overview.operations.lowStockCount} {t("lowStock")}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                    boxShadow: "0 4px 12px rgb(0 0 0 / 0.1)",
                  }}
                  labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#colorRevenue)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick alerts */}
      {(overview.operations.lowStockCount > 0 || overview.operations.outOfStockCount > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {overview.operations.lowStockCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {overview.operations.lowStockCount} {t("lowStock")}
                </p>
                <p className="text-xs text-muted-foreground">{t("lowStockAlert")}</p>
              </div>
            </div>
          )}
          {overview.operations.outOfStockCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <Package className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {overview.operations.outOfStockCount} {t("outOfStock")}
                </p>
                <p className="text-xs text-muted-foreground">{t("outOfStockAlert")}</p>
              </div>
            </div>
          )}
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
  alert,
}: {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-warning/40" : undefined}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-2xl font-bold text-card-foreground tabular">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
