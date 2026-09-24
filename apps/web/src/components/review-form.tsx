"use client";

import { Loader2, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Formulaire d'avis partagé produit/boutique.
 * L'API vérifie côté serveur que l'acheteur a bien reçu une commande —
 * le message d'erreur renvoyé explique la règle à l'utilisateur.
 */
export function ReviewForm({ endpoint, onSuccess }: { endpoint: string; onSuccess?: () => void }) {
  const t = useTranslations("reviews");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-4">
        <p className="text-sm text-muted-foreground">{t("loginRequired")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">{t("loginButton")}</Link>
        </Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || submitting) {
      if (rating === 0) setError(t("ratingRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      toast.success(t("success"));
      setComment("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
      <p className="text-sm font-medium text-card-foreground">{t("yourRating")}</p>

      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${value}/5`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (hover || rating) >= value
                  ? "fill-warning text-warning"
                  : "fill-transparent text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("commentPlaceholder")}
        maxLength={1000}
        rows={3}
        className="mt-3 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] leading-tight text-muted-foreground">{t("verifiedNote")}</p>
        <Button type="submit" size="sm" disabled={submitting || rating === 0} className="shrink-0">
          {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
