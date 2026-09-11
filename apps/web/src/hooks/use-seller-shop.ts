"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useSellerShop() {
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shop = user?.shops?.[0];
  const isSeller = user?.role === "VENDEUR";

  return {
    mounted,
    user,
    shop,
    isSeller,
    shopId: shop?.id,
    isLoading: !mounted,
    hasShop: Boolean(shop),
  };
}
