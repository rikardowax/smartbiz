"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateSupplierForm } from "@/components/seller/create-supplier";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";
import { Button } from "@/components/ui/button";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
}

export default function SuppliersPage() {
  const t = useTranslations("erp");
  const [showForm, setShowForm] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const columns: SimpleListColumn<Supplier>[] = [
    { label: t("name"), accessor: (s) => s.name },
    { label: t("phone"), accessor: (s) => s.phone },
    { label: t("city"), accessor: (s) => s.city ?? "—" },
    { label: t("email"), accessor: (s) => s.email ?? "—" },
  ];

  const handleCreated = () => {
    setShowForm(false);
    setRefetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("suppliers")}</h1>
        <Button onClick={() => setShowForm((s) => !s)} variant="outline">
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? t("cancel") : t("addSupplier")}
        </Button>
      </div>

      {showForm && (
        <CreateSupplierForm onCancel={() => setShowForm(false)} onSuccess={handleCreated} />
      )}

      <SimpleList<Supplier>
        path="/suppliers?limit=100"
        title={t("suppliers")}
        columns={columns}
        refetchKey={refetchKey}
      />
    </div>
  );
}
