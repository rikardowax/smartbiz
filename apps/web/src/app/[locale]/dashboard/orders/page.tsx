"use client";

import { MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateManualOrderForm } from "@/components/seller/create-manual-order";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";
import { Button } from "@/components/ui/button";

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

export default function OrdersPage() {
  const t = useTranslations("erp");
  const [showForm, setShowForm] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const columns: SimpleListColumn<Order>[] = [
    { label: t("orderNumber"), accessor: (o) => o.orderNumber, className: "min-w-[120px]" },
    { label: t("name"), accessor: (o) => o.contactName },
    { label: t("total"), accessor: (o) => `${o.total.toLocaleString()} FCFA` },
    { label: t("status"), accessor: (o) => o.status },
    { label: t("paymentStatus"), accessor: (o) => o.paymentStatus },
    { label: t("date"), accessor: (o) => new Date(o.placedAt).toLocaleDateString() },
    {
      label: t("contactClient"),
      render: (o) =>
        o.contactPhone ? (
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
        ) : null,
    },
  ];

  const handleCreated = () => {
    setShowForm(false);
    setRefetchKey((k) => k + 1);
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
