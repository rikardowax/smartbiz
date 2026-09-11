"use client";

import { useTranslations } from "next-intl";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
}

export default function SuppliersPage() {
  const t = useTranslations("erp");
  const columns: SimpleListColumn<Supplier>[] = [
    { label: t("name"), accessor: (s) => s.name },
    { label: t("phone"), accessor: (s) => s.phone },
    { label: t("city"), accessor: (s) => s.city ?? "—" },
    { label: t("email"), accessor: (s) => s.email ?? "—" },
  ];

  return (
    <SimpleList<Supplier> path="/suppliers?limit=100" title={t("suppliers")} columns={columns} />
  );
}
