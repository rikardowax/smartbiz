"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";

export function CreateTransactionForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [category, setCategory] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    const amountNum = Number.parseInt(amount, 10);
    if (!category.trim() || !label.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error(t("error"));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`/shops/${shopId}/finance/transactions`, {
        method: "POST",
        body: JSON.stringify({
          type,
          category: category.trim(),
          label: label.trim(),
          amount: amountNum,
          occurredAt: occurredAt || undefined,
        }),
      });
      toast.success(t("createTransactionSuccess"));
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-card-foreground">{t("addTransaction")}</h2>

      <div>
        <Label htmlFor="transactionType" required>
          {t("transactionType")}
        </Label>
        <select
          id="transactionType"
          value={type}
          onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="INCOME">{t("income")}</option>
          <option value="EXPENSE">{t("expense")}</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transactionCategory" required>
            {t("transactionCategory")}
          </Label>
          <Input
            id="transactionCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t("transactionCategory")}
            required
          />
        </div>
        <div>
          <Label htmlFor="transactionAmount" required>
            {t("transactionAmount")} (FCFA)
          </Label>
          <Input
            id="transactionAmount"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="transactionLabel" required>
          {t("transactionLabel")}
        </Label>
        <Input
          id="transactionLabel"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("transactionLabel")}
          required
        />
      </div>

      <div>
        <Label htmlFor="transactionDate">{t("transactionDate")}</Label>
        <Input
          id="transactionDate"
          type="date"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addTransaction")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
