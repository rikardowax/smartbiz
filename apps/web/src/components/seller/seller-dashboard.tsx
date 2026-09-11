"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("todayRevenue")} value={`${fmt(overview.today.revenue)} FCFA`} />
        <StatCard title={t("todayOrders")} value={overview.today.orderCount.toString()} />
        <StatCard title={t("monthRevenue")} value={`${fmt(overview.month.revenue)} FCFA`} />
        <StatCard title={t("monthProfit")} value={`${fmt(overview.month.profit)} FCFA`} />
        <StatCard title={t("pendingOrders")} value={overview.operations.pendingOrders.toString()} />
        <StatCard title={t("lowStock")} value={overview.operations.lowStockCount.toString()} />
        <StatCard title={t("productsCount")} value={overview.catalog.productCount.toString()} />
        <StatCard title={t("stockValue")} value={`${fmt(overview.catalog.stockValue)} FCFA`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("salesTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                  }}
                  labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-card-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
