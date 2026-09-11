"use client";

import { ImageIcon, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSellerShop } from "@/hooks/use-seller-shop";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

export function CreateProductForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [unit, setUnit] = useState("pièce");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    apiFetch<Category[]>("/categories")
      .then((res) => setCategories(res))
      .catch(() => setCategories([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    const priceNum = Number.parseInt(price, 10);
    const stockNum = Number.parseInt(stockQuantity, 10);
    if (!name.trim() || Number.isNaN(priceNum) || priceNum < 0) {
      toast.error(t("error"));
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      price: priceNum,
      stockQuantity: Number.isNaN(stockNum) ? 0 : stockNum,
      description: description.trim() || undefined,
      categoryId: categoryId || undefined,
      unit: unit.trim() || "pièce",
      lowStockThreshold: Number.parseInt(lowStockThreshold, 10) || 5,
      images: imageUrl.trim() ? [imageUrl.trim()] : undefined,
    };

    const cost = Number.parseInt(costPrice, 10);
    if (!Number.isNaN(cost) && cost >= 0) payload.costPrice = cost;

    const compare = Number.parseInt(compareAtPrice, 10);
    if (!Number.isNaN(compare) && compare >= 0) payload.compareAtPrice = compare;

    setIsSubmitting(true);
    try {
      await apiFetch(`/shops/${shopId}/products`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(t("createProductSuccess"));
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
      <h2 className="text-lg font-semibold text-card-foreground">{t("addProduct")}</h2>

      <div>
        <Label htmlFor="productName" required>
          {t("name")}
        </Label>
        <Input
          id="productName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("productName")}
          required
        />
      </div>

      <div>
        <Label htmlFor="productCategory">{t("category")}</Label>
        <select
          id="productCategory"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !categoryId && "text-muted-foreground",
          )}
        >
          <option value="">{t("selectCategory")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="productPrice" required>
            {t("price")} (FCFA)
          </Label>
          <Input
            id="productPrice"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1000"
            required
          />
        </div>
        <div>
          <Label htmlFor="productStock" required>
            {t("quantity")}
          </Label>
          <Input
            id="productStock"
            type="number"
            min={0}
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            placeholder="10"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="productCost">{t("costPrice")}</Label>
          <Input
            id="productCost"
            type="number"
            min={0}
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder={t("costPrice")}
          />
        </div>
        <div>
          <Label htmlFor="productCompare">{t("compareAtPrice")}</Label>
          <Input
            id="productCompare"
            type="number"
            min={0}
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
            placeholder={t("compareAtPrice")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="productUnit">{t("unit")}</Label>
          <Input
            id="productUnit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="pièce"
          />
        </div>
        <div>
          <Label htmlFor="productLowStock">{t("lowStockThreshold")}</Label>
          <Input
            id="productLowStock"
            type="number"
            min={0}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="productDescription">{t("description")}</Label>
        <Input
          id="productDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("productDescriptionPlaceholder")}
        />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Label htmlFor="productImage">{t("productImage")}</Label>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          id="productImage"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder={t("productImagePlaceholder")}
        />
        {imageUrl.trim() && (
          <img
            src={imageUrl}
            alt=""
            className="mt-3 h-32 w-full rounded-lg border border-border object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addProduct")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
