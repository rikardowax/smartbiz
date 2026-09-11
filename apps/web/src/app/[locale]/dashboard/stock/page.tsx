"use client";

import { useTranslations } from "next-intl";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";

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

  return (
    <div className="space-y-8">
      <SimpleList<Alert> path="/stock/alerts" title={t("lowStock")} columns={alertColumns} />
      <SimpleList<Movement>
        path="/stock/movements"
        title="Mouvements de stock"
        columns={movementColumns}
      />
    </div>
  );
}
