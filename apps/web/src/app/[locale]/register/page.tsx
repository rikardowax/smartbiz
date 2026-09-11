"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api";
import { type User, useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);

  const phoneRegex = /^\+?[0-9]{8,15}$/;

  const schema = z
    .object({
      firstName: z.string().min(1, t("fieldRequired")),
      lastName: z.string().min(1, t("fieldRequired")),
      phone: z.string().min(1, t("fieldRequired")).regex(phoneRegex, t("phoneInvalid")),
      email: z.union([z.literal(""), z.string().email(t("emailInvalid"))]).optional(),
      password: z.string().min(8, t("passwordMin")),
      role: z.enum(["ACHETEUR", "VENDEUR"]),
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
    defaultValues: {
      role: "ACHETEUR",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        email: data.email || undefined,
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
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("registerError"));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
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
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              error={errors.password}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Label>{t("role")}</Label>
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-input p-1">
              {(["ACHETEUR", "VENDEUR"] as const).map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                >
                  <input type="radio" value={role} {...register("role")} className="sr-only" />
                  {role === "ACHETEUR" ? t("roleBuyer") : t("roleSeller")}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("submitRegister")}
          </Button>
        </form>

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
