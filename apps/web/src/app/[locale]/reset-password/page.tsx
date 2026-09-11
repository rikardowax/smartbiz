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

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const [success, setSuccess] = useState(false);
  const phoneRegex = /^\+?[0-9]{8,15}$/;

  const schema = z
    .object({
      phone: z.string().min(1, t("fieldRequired")).regex(phoneRegex, t("phoneInvalid")),
      code: z.string().min(6, t("fieldRequired")).max(6, t("fieldRequired")),
      newPassword: z.string().min(8, t("passwordMin")),
      confirmPassword: z.string().min(1, t("fieldRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("passwordsMatch"),
      path: ["confirmPassword"],
    });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          phone: data.phone,
          code: data.code,
          newPassword: data.newPassword,
        }),
      });
      setSuccess(true);
      toast.success(t("resetSuccess"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("loginError"));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-card-foreground">{t("resetTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("resetSubtitle")}</p>
        </div>

        {success ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{t("resetSuccess")}</p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/login">{t("loginNow")}</Link>
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

            <div>
              <Label htmlFor="code" required>
                {t("resetCode")}
              </Label>
              <Input id="code" {...register("code")} error={errors.code} />
              {errors.code && (
                <p className="mt-1 text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newPassword" required>
                {t("newPassword")}
              </Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register("newPassword")}
                error={errors.newPassword}
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" required>
                {t("confirmPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("submitReset")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
