"use client";

import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateProductForm } from "@/components/seller/create-product";
import { type EditableProduct, EditProductForm } from "@/components/seller/edit-product";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  costPrice: number | null;
  compareAtPrice: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
  images: string[];
  status: string;
  category: { id: string; name: string } | null;
}

export default function ProductsPage() {
  const t = useTranslations("erp");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const columns: SimpleListColumn<Product>[] = [
    { label: t("name"), accessor: (p) => p.name, className: "min-w-[180px]" },
    { label: t("category"), accessor: (p) => p.category?.name ?? "—" },
    { label: t("price"), accessor: (p) => `${p.price.toLocaleString()} FCFA` },
    { label: t("quantity"), accessor: (p) => p.stockQuantity },
    { label: t("status"), accessor: (p) => p.status },
    {
      label: t("actions"),
      render: (p) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setEditingProduct({
              id: p.id,
              name: p.name,
              description: p.description,
              categoryId: p.category?.id ?? null,
              category: p.category,
              price: p.price,
              costPrice: p.costPrice,
              compareAtPrice: p.compareAtPrice,
              stockQuantity: p.stockQuantity,
              lowStockThreshold: p.lowStockThreshold,
              unit: p.unit,
              images: p.images,
              status: p.status,
            })
          }
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
      className: "w-24",
    },
  ];

  const handleCreated = () => {
    setShowForm(false);
    setRefetchKey((k) => k + 1);
  };

  const handleUpdated = () => {
    setEditingProduct(null);
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

      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onCancel={() => setEditingProduct(null)}
          onSuccess={handleUpdated}
        />
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
