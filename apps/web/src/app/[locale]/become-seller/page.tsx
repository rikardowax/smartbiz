"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateShopForm } from "@/components/seller/create-shop";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Point d'entrée « Devenir vendeur » : le compte existe déjà, il ne manque que
 * la boutique. La création promeut le rôle ACHETEUR -> VENDEUR côté API.
 */
export default function BecomeSellerPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSeller = user?.role === "VENDEUR" || user?.role === "ADMIN";

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.replace("/register");
    } else if (isSeller && user?.shops?.length) {
      router.replace("/dashboard");
    }
  }, [mounted, isAuthenticated, isSeller, user?.shops?.length, router]);

  if (!mounted || !isAuthenticated || (isSeller && user?.shops?.length)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <CreateShopForm />;
}
