"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateStockMovementForm } from "@/components/seller/create-stock-movement";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";
import { Button } from "@/components/ui/button";

interface Alert {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  severity: string;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  product: { name: string };
  reason: string | null;
  createdAt: string;
}

export default function StockPage() {
  const t = useTranslations("erp");
  const [showForm, setShowForm] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const alertColumns: SimpleListColumn<Alert>[] = [
    { label: t("name"), accessor: (a) => a.name, className: "min-w-[180px]" },
    { label: t("quantity"), accessor: (a) => `${a.stockQuantity} ${a.unit}` },
    { label: t("status"), accessor: (a) => a.severity },
  ];

  const movementColumns: SimpleListColumn<Movement>[] = [
    { label: t("date"), accessor: (m) => new Date(m.createdAt).toLocaleDateString() },
    { label: t("name"), accessor: (m) => m.product.name },
    { label: t("status"), accessor: (m) => m.type },
    { label: t("quantity"), accessor: (m) => m.quantity },
    { label: t("name"), accessor: (m) => m.reason ?? "—" },
  ];

  const handleCreated = () => {
    setShowForm(false);
    setRefetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("stock")}</h1>
        <Button onClick={() => setShowForm((s) => !s)} variant="outline">
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? t("cancel") : t("addStockMovement")}
        </Button>
      </div>

      {showForm && (
        <CreateStockMovementForm onCancel={() => setShowForm(false)} onSuccess={handleCreated} />
      )}

      <SimpleList<Alert>
        path="/stock/alerts"
        title={t("lowStock")}
        columns={alertColumns}
        refetchKey={refetchKey}
      />
      <SimpleList<Movement>
        path="/stock/movements"
        title="Mouvements de stock"
        columns={movementColumns}
        refetchKey={refetchKey}
      />
    </div>
  );
}
