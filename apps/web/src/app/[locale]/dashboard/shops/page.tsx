"use client";

import { Eye, Loader2, Package, ShoppingCart, Store, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { CreateShopForm } from "@/components/seller/create-shop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { Link } from "@/i18n/navigation";

export default function MyShopsPage() {
  const t = useTranslations("erp");
  const { user, isSeller, isLoading, hasShop } = useSellerShop();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
        <p className="text-lg font-medium text-card-foreground">{t("sellerOnly")}</p>
      </div>
    );
  }

  if (!hasShop) {
    return <CreateShopForm />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("myShops")}</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {user?.shops?.map((shop) => (
          <Card key={shop.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Store className="h-6 w-6" />
              </div>
              <CardTitle className="mt-2 text-lg">{shop.name}</CardTitle>
              <p className="text-xs text-muted-foreground uppercase">{shop.status}</p>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <Button asChild size="sm" className="w-full">
                <Link href={`/shops/${shop.slug}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t("viewPublicShop")}
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/products">
                    <Package className="mr-1.5 h-4 w-4" />
                    {t("products")}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/orders">
                    <ShoppingCart className="mr-1.5 h-4 w-4" />
                    {t("orders")}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="col-span-2">
                  <Link href="/dashboard/customers">
                    <Users className="mr-1.5 h-4 w-4" />
                    {t("customers")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
