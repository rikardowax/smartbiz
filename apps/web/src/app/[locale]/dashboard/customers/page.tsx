"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateCustomerForm } from "@/components/seller/create-customer";
import { SimpleList, type SimpleListColumn } from "@/components/seller/simple-list";
import { Button } from "@/components/ui/button";

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
  const [showForm, setShowForm] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  const columns: SimpleListColumn<Customer>[] = [
    { label: t("name"), accessor: (c) => c.name },
    { label: t("phone"), accessor: (c) => c.phone },
    { label: t("city"), accessor: (c) => c.city ?? "—" },
    { label: t("orders"), accessor: (c) => c.totalOrders },
  ];

  const handleCreated = () => {
    setShowForm(false);
    setRefetchKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("customers")}</h1>
        <Button onClick={() => setShowForm((s) => !s)} variant="outline">
          <Plus className="mr-1.5 h-4 w-4" />
          {showForm ? t("cancel") : t("addCustomer")}
        </Button>
      </div>

      {showForm && (
        <CreateCustomerForm onCancel={() => setShowForm(false)} onSuccess={handleCreated} />
      )}

      <SimpleList<Customer>
        path="/customers?limit=100"
        title={t("customers")}
        columns={columns}
        refetchKey={refetchKey}
      />
    </div>
  );
}
