"use client";

import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductImageUpload } from "@/components/product-image-upload";
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

export interface EditableProduct {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  price: number;
  costPrice: number | null;
  compareAtPrice: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
  images: string[];
  status: string;
}

export function EditProductForm({
  product,
  onCancel,
  onSuccess,
}: {
  product: EditableProduct;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("erp");
  const { shopId } = useSellerShop();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [categoryId, setCategoryId] = useState(product.categoryId ?? product.category?.id ?? "");
  const [price, setPrice] = useState(product.price.toString());
  const [costPrice, setCostPrice] = useState(product.costPrice?.toString() ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(product.compareAtPrice?.toString() ?? "");
  const [stockQuantity, setStockQuantity] = useState(product.stockQuantity.toString());
  const [lowStockThreshold, setLowStockThreshold] = useState(product.lowStockThreshold.toString());
  const [unit, setUnit] = useState(product.unit);
  const [image, setImage] = useState(product.images?.[0] ?? "");

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
      images: image.trim() ? [image.trim()] : undefined,
      status: product.status,
    };

    const cost = Number.parseInt(costPrice, 10);
    if (!Number.isNaN(cost) && cost >= 0) payload.costPrice = cost;

    const compare = Number.parseInt(compareAtPrice, 10);
    if (!Number.isNaN(compare) && compare >= 0) payload.compareAtPrice = compare;

    setIsSubmitting(true);
    try {
      await apiFetch(`/shops/${shopId}/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast.success(t("updateProductSuccess"));
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
      <h2 className="text-lg font-semibold text-card-foreground">{t("editProduct")}</h2>

      <div>
        <Label htmlFor={`editProductName-${product.id}`} required>
          {t("name")}
        </Label>
        <Input
          id={`editProductName-${product.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("productName")}
          required
        />
      </div>

      <div>
        <Label htmlFor={`editProductCategory-${product.id}`}>{t("category")}</Label>
        <select
          id={`editProductCategory-${product.id}`}
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
          <Label htmlFor={`editProductPrice-${product.id}`} required>
            {t("price")} (FCFA)
          </Label>
          <Input
            id={`editProductPrice-${product.id}`}
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1000"
            required
          />
        </div>
        <div>
          <Label htmlFor={`editProductStock-${product.id}`} required>
            {t("quantity")}
          </Label>
          <Input
            id={`editProductStock-${product.id}`}
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
          <Label htmlFor={`editProductCost-${product.id}`}>{t("costPrice")}</Label>
          <Input
            id={`editProductCost-${product.id}`}
            type="number"
            min={0}
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder={t("costPrice")}
          />
        </div>
        <div>
          <Label htmlFor={`editProductCompare-${product.id}`}>{t("compareAtPrice")}</Label>
          <Input
            id={`editProductCompare-${product.id}`}
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
          <Label htmlFor={`editProductUnit-${product.id}`}>{t("unit")}</Label>
          <Input
            id={`editProductUnit-${product.id}`}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="pièce"
          />
        </div>
        <div>
          <Label htmlFor={`editProductLowStock-${product.id}`}>{t("lowStockThreshold")}</Label>
          <Input
            id={`editProductLowStock-${product.id}`}
            type="number"
            min={0}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor={`editProductDescription-${product.id}`}>{t("description")}</Label>
        <Input
          id={`editProductDescription-${product.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("productDescriptionPlaceholder")}
        />
      </div>

      <ProductImageUpload
        name={`editProductImage-${product.id}`}
        value={image}
        onChange={setImage}
      />

      <div className="flex gap-3">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-1.5 h-4 w-4" />
          {t("save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
