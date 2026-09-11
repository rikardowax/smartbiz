"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CreateTransactionForm } from "@/components/seller/create-transaction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";

interface FinanceSummary {
  totals: {
    income: number;
    expense: number;
    balance: number;
  };
  byCategory: {
    type: string;
    category: string;
    amount: number;
  }[];
  monthly: {
    month: string;
    income: number;
    expense: number;
    balance: number;
  }[];
}

export default function FinancePage() {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    void refetchKey;
    setLoading(true);
    apiFetch<FinanceSummary>(`/shops/${shopId}/finance/summary`)
      .then(setSummary)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("error")))
      .finally(() => setLoading(false));
  }, [shopId, t, refetchKey]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error || t("error")}
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString();

  const handleCreated = () => {
    setShowForm(false);
    setRefetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("finance")}</h1>
        <Button onClick={() => setShowForm((s) => !s)} variant="outline">
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? t("cancel") : t("addTransaction")}
        </Button>
      </div>

      {showForm && (
        <CreateTransactionForm onCancel={() => setShowForm(false)} onSuccess={handleCreated} />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={t("income")} value={`${fmt(summary.totals.income)} FCFA`} />
        <StatCard title={t("expense")} value={`${fmt(summary.totals.expense)} FCFA`} />
        <StatCard title={t("profit")} value={`${fmt(summary.totals.balance)} FCFA`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {summary.byCategory.map((c) => (
              <div
                key={`${c.type}-${c.category}`}
                className="flex items-center justify-between py-3"
              >
                <span className="text-card-foreground">
                  {c.type === "INCOME" ? "+" : "—"} {c.category}
                </span>
                <span className="font-semibold text-card-foreground">{fmt(c.amount)} FCFA</span>
              </div>
            ))}
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
