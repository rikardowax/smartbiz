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

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);

  const schema = z.object({
    identifier: z.string().min(1, t("fieldRequired")),
    password: z.string().min(1, t("fieldRequired")),
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setAuth(res);
      const me = await apiFetch<User>("/auth/me");
      setUser(me);
      toast.success(t("loginSuccess"));
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("loginError"));
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden p-4">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Large morphing blobs */}
        <div className="animate-morph-blob absolute -top-32 -left-32 h-[500px] w-[500px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl" />
        <div
          className="animate-morph-blob absolute -bottom-40 -right-40 h-[600px] w-[600px] bg-gradient-to-tl from-accent/20 via-primary/5 to-transparent blur-3xl"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="animate-morph-blob absolute top-1/3 left-1/2 h-[350px] w-[350px] -translate-x-1/2 bg-gradient-to-r from-primary/15 to-accent/10 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />

        {/* Orbiting particles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-orbit"
            style={{ ["--orbit-radius" as string]: "220px", ["--orbit-duration" as string]: "18s" }}
          >
            <div className="h-3 w-3 rounded-full bg-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.4)]" />
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-orbit"
            style={{
              ["--orbit-radius" as string]: "280px",
              ["--orbit-duration" as string]: "25s",
              animationDirection: "reverse",
            }}
          >
            <div className="h-2 w-2 rounded-full bg-primary/25" />
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-orbit"
            style={{ ["--orbit-radius" as string]: "160px", ["--orbit-duration" as string]: "14s" }}
          >
            <div className="h-4 w-4 rounded-full bg-accent/20 shadow-[0_0_16px_hsl(var(--accent)/0.3)]" />
          </div>
        </div>

        {/* Drifting geometric shapes */}
        <div
          className="animate-drift-slow absolute top-[15%] left-[10%] h-16 w-16 rounded-lg border border-primary/15 bg-primary/5"
          style={{ animationDelay: "-3s" }}
        />
        <div
          className="animate-drift-slow absolute top-[70%] right-[12%] h-12 w-12 rounded-full border border-primary/10 bg-primary/5"
          style={{ animationDelay: "-10s" }}
        />
        <div
          className="animate-drift-slow absolute top-[25%] right-[20%] h-8 w-8 rotate-45 border border-accent/15 bg-accent/5"
          style={{ animationDelay: "-18s" }}
        />
        <div
          className="animate-drift-slow absolute bottom-[20%] left-[18%] h-10 w-10 rounded-lg border border-primary/10 bg-primary/5 rotate-12"
          style={{ animationDelay: "-6s" }}
        />

        {/* Pulse rings around center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="animate-pulse-ring h-[400px] w-[400px] rounded-full border border-primary/10" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="animate-pulse-ring h-[550px] w-[550px] rounded-full border border-primary/5"
            style={{ animationDelay: "-2s" }}
          />
        </div>
      </div>

      {/* Card with shimmer border effect */}
      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="animate-shimmer-border absolute -inset-px rounded-2xl" />
        <div className="relative rounded-2xl border border-border/40 bg-card/95 p-8 shadow-2xl backdrop-blur-md">
          {/* Logo */}
          <div className="mb-6 text-center animate-slide-in-stagger">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-primary/25 animate-gradient-shift">
              <Store className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-card-foreground">{t("loginTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("loginSubtitle")}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-slide-in-stagger">
            <div>
              <Label htmlFor="identifier" required>
                {t("identifier")}
              </Label>
              <Input
                id="identifier"
                placeholder={t("identifierPlaceholder")}
                autoComplete="tel email"
                {...register("identifier")}
                error={errors.identifier}
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-destructive">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" required>
                  {t("password")}
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                {...register("password")}
                error={errors.password}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("submitLogin")}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("orContinueWith")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleLoginButton />

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              {t("registerNow")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
