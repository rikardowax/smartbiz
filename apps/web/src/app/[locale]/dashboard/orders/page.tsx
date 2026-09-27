"use client";

import { MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { CreateManualOrderForm } from "@/components/seller/create-manual-order";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";
import { Button } from "@/components/ui/button";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  contactName: string;
  contactPhone: string;
  total: number;
  status: string;
  paymentStatus: string;
  placedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  CONFIRMED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PREPARING: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  SHIPPED: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  DELIVERED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const PAYMENT_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PARTIAL: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  REFUNDED: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  FAILED: "bg-red-500/10 text-red-600 dark:text-red-400",
};

// Mirrors ALLOWED_TRANSITIONS in orders.service.ts — primary action first.
const NEXT_ACTIONS: Record<string, { status: string; labelKey: string }[]> = {
  PENDING: [
    { status: "CONFIRMED", labelKey: "confirmOrder" },
    { status: "CANCELLED", labelKey: "cancelOrder" },
  ],
  CONFIRMED: [
    { status: "PREPARING", labelKey: "prepareOrder" },
    { status: "SHIPPED", labelKey: "shipOrder" },
    { status: "CANCELLED", labelKey: "cancelOrder" },
  ],
  PREPARING: [
    { status: "SHIPPED", labelKey: "shipOrder" },
    { status: "CANCELLED", labelKey: "cancelOrder" },
  ],
  SHIPPED: [
    { status: "DELIVERED", labelKey: "deliverOrder" },
    { status: "CANCELLED", labelKey: "cancelOrder" },
  ],
};

function Badge({
  value,
  styles,
  t,
}: {
  value: string;
  styles: Record<string, string>;
  t: (k: string) => string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[value] ?? "bg-muted text-muted-foreground",
      )}
    >
      {t(value) || value}
    </span>
  );
}

export default function OrdersPage() {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [showForm, setShowForm] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => setRefetchKey((k) => k + 1);

  const updateStatus = async (orderId: string, status: string) => {
    if (!shopId || busyId) return;
    setBusyId(orderId);
    try {
      await apiFetch(`/shops/${shopId}/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(t("statusUpdated"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusyId(null);
    }
  };

  const markPaid = async (orderId: string) => {
    if (!shopId || busyId) return;
    setBusyId(orderId);
    try {
      await apiFetch(`/shops/${shopId}/orders/${orderId}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: "PAID" }),
      });
      toast.success(t("paymentUpdated"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusyId(null);
    }
  };

  const columns: SimpleListColumn<Order>[] = [
    { label: t("orderNumber"), accessor: (o) => o.orderNumber, className: "min-w-[120px]" },
    { label: t("name"), accessor: (o) => o.contactName },
    { label: t("total"), accessor: (o) => `${o.total.toLocaleString()} FCFA` },
    {
      label: t("status"),
      render: (o) => <Badge value={o.status} styles={STATUS_STYLES} t={(k) => t(`status_${k}`)} />,
    },
    {
      label: t("paymentStatus"),
      render: (o) => (
        <Badge
          value={o.paymentStatus}
          styles={PAYMENT_STYLES}
          t={(k) => t(`orderPaymentStatus${k}`)}
        />
      ),
    },
    { label: t("date"), accessor: (o) => new Date(o.placedAt).toLocaleDateString() },
    {
      label: t("actions"),
      className: "min-w-[220px]",
      render: (o) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {(NEXT_ACTIONS[o.status] ?? []).map((action, i) => (
            <button
              key={action.status}
              type="button"
              disabled={busyId === o.id}
              onClick={() => updateStatus(o.id, action.status)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                action.status === "CANCELLED"
                  ? "text-red-600 hover:bg-red-500/10 dark:text-red-400"
                  : i === 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border text-foreground hover:bg-muted",
              )}
            >
              {t(action.labelKey)}
            </button>
          ))}
          {o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && (
            <button
              type="button"
              disabled={busyId === o.id}
              onClick={() => markPaid(o.id)}
              className="rounded-md border border-emerald-500/40 px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
            >
              {t("markPaid")}
            </button>
          )}
          {o.contactPhone && (
            <a
              href={`https://wa.me/${o.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                t("whatsappClientMessage", { name: o.contactName, order: o.orderNumber }),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#128C7E]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
        </div>
      ),
    },
  ];

  const handleCreated = () => {
    setShowForm(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("orders")}</h1>
        <Button onClick={() => setShowForm((s) => !s)} variant="outline">
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? t("cancel") : t("addOrder")}
        </Button>
      </div>

      {showForm && (
        <CreateManualOrderForm onCancel={() => setShowForm(false)} onSuccess={handleCreated} />
      )}

      <SimpleList<Order>
        path="/orders?limit=100"
        title={t("orders")}
        columns={columns}
        refetchKey={refetchKey}
      />
    </div>
  );
}
