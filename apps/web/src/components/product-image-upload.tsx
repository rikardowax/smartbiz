"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

const MAX_WIDTH = 900;
const JPEG_QUALITY = 0.82;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > MAX_WIDTH || height > MAX_WIDTH) {
        if (width > height) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else {
          width = Math.round((width * MAX_WIDTH) / height);
          height = MAX_WIDTH;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas non supporté"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire l'image"));
    };
    img.src = url;
  });
}

export function ProductImageUpload({ value, onChange, name }: ProductImageUploadProps) {
  const t = useTranslations("erp");
  const [preview, setPreview] = useState(value);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const dataUrl = await resizeImage(file);
      setPreview(dataUrl);
      onChange(dataUrl);
    } catch {
      // on garde l'ancienne valeur en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setPreview("");
    onChange("");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{t("productImage")}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={name}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="cursor-pointer"
          disabled={loading}
        />
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {preview && !loading && (
        <div className="relative mt-3 inline-block">
          {/* biome-ignore lint/performance/noImgElement: aperçu local en data URL, hors pipeline next/image */}
          <img
            src={preview}
            alt={t("productImage")}
            className="h-40 w-auto rounded-lg border border-border object-cover"
          />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -right-2 -top-2 h-7 w-7 rounded-full"
            onClick={clear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {!preview && !loading && (
        <div className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 text-sm text-muted-foreground">
          <Upload className="mr-2 h-4 w-4" />
          {t("productImageHint")}
        </div>
      )}
    </div>
  );
}
