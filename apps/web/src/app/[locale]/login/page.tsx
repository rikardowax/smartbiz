"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { GoogleLoginButton } from "@/components/auth/google-login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-card-foreground">{t("loginTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("loginSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              error={errors.password}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
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
  );
}
