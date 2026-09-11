"use client";

import { useTranslations } from "next-intl";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";

interface Order {
  id: string;
  orderNumber: string;
  contactName: string;
  total: number;
  status: string;
  paymentStatus: string;
  placedAt: string;
}

export default function OrdersPage() {
  const t = useTranslations("erp");
  const columns: SimpleListColumn<Order>[] = [
    { label: t("name"), accessor: (o) => o.orderNumber },
    { label: t("name"), accessor: (o) => o.contactName },
    { label: t("total"), accessor: (o) => `${o.total.toLocaleString()} FCFA` },
    { label: t("status"), accessor: (o) => o.status },
    { label: t("date"), accessor: (o) => new Date(o.placedAt).toLocaleDateString() },
  ];

  return <SimpleList<Order> path="/orders?limit=100" title={t("orders")} columns={columns} />;
}
