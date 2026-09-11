"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateProductForm } from "@/components/seller/create-product";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";
import { Button } from "@/components/ui/button";

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
  const [showForm, setShowForm] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const columns: SimpleListColumn<Product>[] = [
    { label: t("name"), accessor: (p) => p.name, className: "min-w-[180px]" },
    { label: t("category"), accessor: (p) => p.category?.name ?? "—" },
    { label: t("price"), accessor: (p) => `${p.price.toLocaleString()} FCFA` },
    { label: t("quantity"), accessor: (p) => p.stockQuantity },
    { label: t("status"), accessor: (p) => p.status },
  ];

  const handleCreated = () => {
    setShowForm(false);
    setRefetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("products")}</h1>
        <Button onClick={() => setShowForm((s) => !s)} variant="outline">
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? t("cancel") : t("addProduct")}
        </Button>
      </div>

      {showForm && (
        <CreateProductForm onCancel={() => setShowForm(false)} onSuccess={handleCreated} />
      )}

      <SimpleList<Product>
        path="/products?limit=100"
        title={t("products")}
        columns={columns}
        refetchKey={refetchKey}
      />
    </div>
  );
}
