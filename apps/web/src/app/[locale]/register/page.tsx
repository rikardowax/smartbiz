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
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden p-4 py-12">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Morphing blobs */}
        <div className="animate-morph-blob absolute -top-40 -right-40 h-[550px] w-[550px] bg-gradient-to-bl from-primary/20 via-primary/10 to-transparent blur-3xl" />
        <div
          className="animate-morph-blob absolute -bottom-32 -left-32 h-[500px] w-[500px] bg-gradient-to-tr from-accent/20 via-primary/5 to-transparent blur-3xl"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="animate-morph-blob absolute top-1/4 right-1/3 h-[300px] w-[300px] bg-gradient-to-l from-primary/12 to-accent/8 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />

        {/* Orbiting particles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-orbit"
            style={{ ["--orbit-radius" as string]: "240px", ["--orbit-duration" as string]: "22s" }}
          >
            <div className="h-3 w-3 rounded-full bg-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.4)]" />
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-orbit"
            style={{
              ["--orbit-radius" as string]: "300px",
              ["--orbit-duration" as string]: "30s",
              animationDirection: "reverse",
            }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-primary/20" />
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-orbit"
            style={{ ["--orbit-radius" as string]: "170px", ["--orbit-duration" as string]: "16s" }}
          >
            <div className="h-4 w-4 rounded-full bg-accent/20 shadow-[0_0_16px_hsl(var(--accent)/0.3)]" />
          </div>
        </div>

        {/* Drifting shapes */}
        <div
          className="animate-drift-slow absolute top-[10%] right-[8%] h-14 w-14 rounded-full border border-primary/15 bg-primary/5"
          style={{ animationDelay: "-5s" }}
        />
        <div
          className="animate-drift-slow absolute bottom-[15%] left-[8%] h-16 w-16 rounded-lg border border-primary/10 bg-primary/5 rotate-12"
          style={{ animationDelay: "-12s" }}
        />
        <div
          className="animate-drift-slow absolute top-[60%] right-[15%] h-10 w-10 rotate-45 border border-accent/15 bg-accent/5"
          style={{ animationDelay: "-20s" }}
        />
        <div
          className="animate-drift-slow absolute top-[30%] left-[12%] h-8 w-8 rounded-lg border border-primary/10 bg-primary/5"
          style={{ animationDelay: "-8s" }}
        />

        {/* Pulse rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-pulse-ring h-[450px] w-[450px] rounded-full border border-primary/10" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-pulse-ring h-[600px] w-[600px] rounded-full border border-primary/5"
            style={{ animationDelay: "-2s" }}
          />
        </div>
      </div>

      {/* Card with shimmer border */}
      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="animate-shimmer-border absolute -inset-px rounded-2xl" />
        <div className="relative rounded-2xl border border-border/40 bg-card/95 p-8 shadow-2xl backdrop-blur-md">
          {/* Logo */}
          <div className="mb-6 text-center animate-slide-in-stagger">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-primary/25 animate-gradient-shift">
              <Store className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-card-foreground">{t("registerTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("registerSubtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-slide-in-stagger">
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

            <Button
              type="submit"
              className="w-full shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              disabled={isSubmitting}
            >
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
    </div>
  );
}
