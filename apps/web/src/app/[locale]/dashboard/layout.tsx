"use client";

import { Loader2 } from "lucide-react";
import { SellerLayout } from "@/components/layout/seller-layout";
import { useSellerShop } from "@/hooks/use-seller-shop";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isSeller, shop } = useSellerShop();

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSeller && shop) {
    return <SellerLayout shopName={shop.name}>{children}</SellerLayout>;
  }

  return <>{children}</>;
}
