"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ConfirmRequest {
  title: string;
  description: string;
  /** Conséquences irréversibles listées avant validation. */
  consequences?: string[];
  confirmLabel: string;
  /** Exige de retaper ce texte : garde-fou pour les suppressions en cascade. */
  requireTyped?: string;
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation bloquante pour les actions destructives de l'administration.
 * `window.confirm` ne permet pas d'énumérer ce qui va être détruit, ce qui est
 * indispensable ici : supprimer un vendeur emporte ses boutiques, produits et
 * commandes.
 */
export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setTyped("");
    setPending(false);
    setError("");
    if (request) cancelRef.current?.focus();
  }, [request]);

  useEffect(() => {
    if (!request) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [request, pending, onClose]);

  if (!request) return null;

  const needsTyped = Boolean(request.requireTyped);
  const canConfirm = !pending && (!needsTyped || typed.trim() === request.requireTyped);

  const confirm = async () => {
    if (!canConfirm) return;
    setPending(true);
    setError("");
    try {
      await request.onConfirm();
      onClose();
    } catch (err: unknown) {
      // La boîte reste ouverte avec le message d'erreur de l'API pour que
      // l'administrateur comprenne pourquoi l'action n'a pas abouti.
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("cancel")}
        onClick={() => !pending && onClose()}
        className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-sm"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
        className="animate-page-enter relative w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id={`${inputId}-title`} className="text-lg font-bold text-card-foreground">
              {request.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{request.description}</p>
          </div>
        </div>

        {request.consequences && request.consequences.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-foreground">
            {request.consequences.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="text-destructive">
                  •
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        {needsTyped && (
          <div className="mt-4">
            <label htmlFor={inputId} className="text-sm font-medium text-foreground">
              {t("typeToConfirm", { value: request.requireTyped as string })}
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && confirm()}
              autoComplete="off"
              className="mt-1.5"
            />
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} variant="outline" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={!canConfirm}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {request.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
