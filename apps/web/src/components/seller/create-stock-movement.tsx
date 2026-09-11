"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
}

const MOVEMENT_TYPES = ["IN", "OUT", "RETURN", "LOSS", "ADJUSTMENT"] as const;

export function CreateStockMovementForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productId, setProductId] = useState("");
  const [type, setType] = useState<string>("IN");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!shopId) return;
    apiFetch<{ items: Product[] }>(`/shops/${shopId}/products?limit=500`)
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
    apiFetch<{ items: Supplier[] }>(`/shops/${shopId}/suppliers?limit=500`)
      .then((res) => setSuppliers(res.items))
      .catch(() => setSuppliers([]));
  }, [shopId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    const quantityNum = Number.parseInt(quantity, 10);
    if (!productId.trim() || Number.isNaN(quantityNum) || quantityNum <= 0) {
      toast.error(t("error"));
      return;
    }

    const payload: Record<string, unknown> = {
      productId,
      type,
      quantity: quantityNum,
      reason: reason.trim() || undefined,
      reference: reference.trim() || undefined,
      supplierId: supplierId || undefined,
    };

    const cost = Number.parseInt(unitCost, 10);
    if (!Number.isNaN(cost) && cost >= 0) payload.unitCost = cost;

    setIsSubmitting(true);
    try {
      await apiFetch(`/shops/${shopId}/stock/movements`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(t("createStockMovementSuccess"));
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-card-foreground">{t("addStockMovement")}</h2>

      <div>
        <Label htmlFor="movementProduct" required>
          {t("stockMovementProduct")}
        </Label>
        <select
          id="movementProduct"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !productId && "text-muted-foreground",
          )}
        >
          <option value="" disabled>
            {t("selectProduct")}
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="movementType" required>
            {t("stockMovementType")}
          </Label>
          <select
            id="movementType"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {MOVEMENT_TYPES.map((m) => (
              <option key={m} value={m}>
                {t(`stockMovement${m}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="movementQuantity" required>
            {t("stockMovementQuantity")}
          </Label>
          <Input
            id="movementQuantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="10"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="movementUnitCost">{t("stockMovementUnitCost")}</Label>
          <Input
            id="movementUnitCost"
            type="number"
            min={0}
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="1000"
          />
        </div>
        <div>
          <Label htmlFor="movementSupplier">{t("stockMovementSupplier")}</Label>
          <select
            id="movementSupplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={cn(
              "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !supplierId && "text-muted-foreground",
            )}
          >
            <option value="">{t("selectSupplier")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="movementReason">{t("stockMovementReason")}</Label>
          <Input
            id="movementReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("stockMovementReason")}
          />
        </div>
        <div>
          <Label htmlFor="movementReference">{t("stockMovementReference")}</Label>
          <Input
            id="movementReference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t("stockMovementReference")}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addStockMovement")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
