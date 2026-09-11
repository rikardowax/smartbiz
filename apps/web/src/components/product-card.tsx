"use client";

import { MapPin, Package } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  unit: string;
  images: string[];
  stockQuantity: number;
  soldCount: number;
  ratingAverage: number;
  ratingCount: number;
  category: { name: string; slug: string };
  shop: { name: string; slug: string; city: string };
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function colorFromString(str: string) {
  const hue = [...str].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue} 70% 90%)`;
}

export function ProductCard({
  product,
  addToCart,
}: {
  product: CatalogProduct;
  addToCart?: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const image = product.images?.[0];
  const isPlaceholder = !image || image.includes("picsum.photos");
  const discounted = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {!imageError && !isPlaceholder ? (
          <Image
            src={image}
            alt={product.name}
            fill
            unoptimized
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center text-foreground"
            style={{ backgroundColor: colorFromString(product.category?.name ?? product.name) }}
          >
            <span className="text-3xl font-bold">{initials(product.name)}</span>
            <Package className="mt-2 h-6 w-6 opacity-40" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-muted-foreground">
          {product.category.name} · {product.shop.name}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold text-card-foreground">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <span className="text-lg font-bold text-primary">
              {product.price.toLocaleString()} FCFA
            </span>
            {discounted && (
              <span className="ml-2 text-sm text-muted-foreground line-through">
                {product.compareAtPrice!.toLocaleString()} FCFA
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={addToCart}
            disabled={!addToCart || product.stockQuantity <= 0}
          >
            {product.stockQuantity > 0 ? "+" : "—"}
          </Button>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {product.shop.city}
          </span>
          <span>{product.soldCount} sold</span>
        </div>
      </div>
    </div>
  );
}
