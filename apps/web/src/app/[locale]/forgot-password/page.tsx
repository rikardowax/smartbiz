"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const phoneRegex = /^\+?[0-9]{8,15}$/;

  const schema = z.object({
    phone: z.string().min(1, t("fieldRequired")).regex(phoneRegex, t("phoneInvalid")),
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSent(true);
      toast.success(t("forgotSent"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("loginError"));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-card-foreground">{t("forgotTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("forgotSubtitle")}</p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{t("forgotSent")}</p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/reset-password">{t("resetTitle")}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="phone" required>
                {t("phone")}
              </Label>
              <Input
                id="phone"
                placeholder={t("phonePlaceholder")}
                autoComplete="tel"
                {...register("phone")}
                error={errors.phone}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("sendCode")}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("loginNow")}
          </Link>
        </div>
      </div>
    </div>
  );
}
