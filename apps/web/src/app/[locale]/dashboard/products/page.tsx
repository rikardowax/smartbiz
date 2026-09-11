"use client";

import { useTranslations } from "next-intl";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";

interface Product {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  status: string;
  category: { name: string } | null;
}

export default function ProductsPage() {
  const t = useTranslations("erp");
  const columns: SimpleListColumn<Product>[] = [
    { label: t("name"), accessor: (p) => p.name, className: "min-w-[180px]" },
    { label: t("category"), accessor: (p) => p.category?.name ?? "—" },
    { label: t("price"), accessor: (p) => `${p.price.toLocaleString()} FCFA` },
    { label: t("quantity"), accessor: (p) => p.stockQuantity },
    { label: t("status"), accessor: (p) => p.status },
  ];

  return <SimpleList<Product> path="/products?limit=100" title={t("products")} columns={columns} />;
}
