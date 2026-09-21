"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { GoogleLoginButton } from "@/components/auth/google-login";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { type User, useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);

  const phoneRegex = /^\+?[0-9]{8,15}$/;

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  const schema = z
    .object({
      firstName: z.string().min(1, t("fieldRequired")),
      lastName: z.string().min(1, t("fieldRequired")),
      phone: z.string().min(1, t("fieldRequired")).regex(phoneRegex, t("phoneInvalid")),
      email: z.union([z.literal(""), z.string().email(t("emailInvalid"))]).optional(),
      password: z.string().regex(passwordRegex, t("passwordStrong")),
      confirmPassword: z.string().min(1, t("fieldRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsMatch"),
      path: ["confirmPassword"],
    })
    .transform((data) => ({
      ...data,
      email: data.email || undefined,
    }));

  type FormData = z.input<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { confirmPassword: _, ...rest } = data;
      const payload = {
        ...rest,
        email: rest.email || undefined,
        role: "ACHETEUR" as const,
      };
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAuth(res);
      const me = await apiFetch<User>("/auth/me");
      setUser(me);
      toast.success(t("registerSuccess"));
      router.push("/marketplace");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("registerError"));
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden p-4">
      <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-3xl animate-float-delayed" />
      <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl animate-pulse" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up rounded-2xl border border-border/60 bg-card/95 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lg">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">{t("registerTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("registerSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" required>
                {t("firstName")}
              </Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                {...register("firstName")}
                error={errors.firstName}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName" required>
                {t("lastName")}
              </Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                {...register("lastName")}
                error={errors.lastName}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="phone" required>
              {t("phone")}
            </Label>
            <Input
              id="phone"
              type="tel"
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
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              {...register("email")}
              error={errors.email}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password" required>
              {t("password")}
            </Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              {...register("password")}
              error={errors.password}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" required>
              {t("confirmPassword")}
            </Label>
            <PasswordInput
              id="confirmPassword"
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
            {t("submitRegister")}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{t("orContinueWith")}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleLoginButton />

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("loginNow")}
          </Link>
        </div>
      </div>
    </div>
  );
}
