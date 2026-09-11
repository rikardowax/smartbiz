"use client";

import { useTranslations } from "next-intl";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  totalOrders: number;
}

export default function CustomersPage() {
  const t = useTranslations("erp");
  const columns: SimpleListColumn<Customer>[] = [
    { label: t("name"), accessor: (c) => c.name },
    { label: t("phone"), accessor: (c) => c.phone },
    { label: t("city"), accessor: (c) => c.city ?? "—" },
    { label: t("orders"), accessor: (c) => c.totalOrders },
  ];

  return (
    <SimpleList<Customer> path="/customers?limit=100" title={t("customers")} columns={columns} />
  );
}
