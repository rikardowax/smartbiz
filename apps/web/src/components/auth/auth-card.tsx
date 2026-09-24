"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { type User, useAuthStore } from "@/stores/auth-store";

type AuthMode = "login" | "register";

const SLIDE_MS = 800;

/**
 * Carte unique à double slider : les deux formulaires restent montés côte à
 * côte et un panneau coloré glisse par-dessus pour inviter à basculer.
 * Sur mobile, le panneau devient un bandeau et les formulaires défilent
 * horizontalement en dessous.
 */
export function AuthCard({ initialMode }: { initialMode: AuthMode }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [switching, setSwitching] = useState(false);

  const switchTo = (next: AuthMode) => {
    if (next === mode || switching) return;
    setSwitching(true);
    setMode(next);
    // L'URL suit le formulaire affiché pour que le rafraîchissement et le
    // partage restent cohérents, sans relancer de navigation Next.
    const path = window.location.pathname;
    const target = next === "login" ? "/login" : "/register";
    const source = next === "login" ? "/register" : "/login";
    if (path.endsWith(source)) {
      window.history.replaceState(null, "", path.slice(0, -source.length) + target);
    }
    setTimeout(() => setSwitching(false), SLIDE_MS);
  };

  const registerMode = mode === "register";

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden p-4 py-12">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-md md:max-w-5xl">
        {/* Halo qui s'illumine pendant la glissade */}
        {switching && (
          <div className="animate-flip-glow pointer-events-none absolute -inset-8 rounded-[2rem] bg-primary/25 blur-3xl" />
        )}

        <div className="relative">
          <div className="animate-shimmer-border absolute -inset-px rounded-[1.6rem]" />
          <div
            className={cn(
              "auth-slider relative min-h-[660px] rounded-3xl border border-border/40 bg-card shadow-2xl md:min-h-[680px]",
              registerMode && "is-register",
            )}
          >
            {/* Reflet qui traverse la carte au moment de la bascule */}
            {switching && (
              <div className="animate-shine-sweep pointer-events-none absolute inset-y-0 z-30 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent dark:via-white/10" />
            )}

            <div className="auth-form-panel auth-panel-login" aria-hidden={registerMode}>
              <div className="w-full max-w-sm">
                <FormHeader title={t("loginTitle")} subtitle={t("loginSubtitle")} />
                <LoginForm />
                <AuthDivider label={t("orContinueWith")} />
                <GoogleLoginButton />
              </div>
            </div>

            <div className="auth-form-panel auth-panel-register" aria-hidden={!registerMode}>
              <div className="w-full max-w-sm">
                <FormHeader title={t("registerTitle")} subtitle={t("registerSubtitle")} />
                <RegisterForm />
                <AuthDivider label={t("orContinueWith")} />
                <GoogleLoginButton />
              </div>
            </div>

            {/* Panneau coulissant qui invite à basculer */}
            <div className="auth-overlay-container">
              <div className="auth-overlay bg-brand-gradient animate-gradient-shift">
                <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-black/10 blur-3xl" />
                <OverlayPanel
                  side="left"
                  title={t("panelToLoginTitle")}
                  text={t("panelToLoginText")}
                  cta={t("panelToLoginCta")}
                  onClick={() => switchTo("login")}
                />
                <OverlayPanel
                  side="right"
                  title={t("panelToRegisterTitle")}
                  text={t("panelToRegisterText")}
                  cta={t("panelToRegisterCta")}
                  onClick={() => switchTo("register")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Contenu d'une moitié du panneau coulissant : pitch + bouton de bascule. */
function OverlayPanel({
  side,
  title,
  text,
  cta,
  onClick,
}: {
  side: "left" | "right";
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "auth-overlay-panel",
        side === "left" ? "auth-overlay-left" : "auth-overlay-right",
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-bold leading-tight md:text-3xl">{title}</h2>
        <p className="mt-1 hidden text-sm text-white/80 md:mt-4 md:block md:leading-relaxed">
          {text}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-full border border-white/60 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-primary hover:shadow-lg md:mt-7 md:px-8 md:py-2.5"
      >
        {cta}
      </button>
    </div>
  );
}

/** En-tête de chaque formulaire : logo, titre, sous-titre. */
function FormHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 text-center">
      <div className="animate-gradient-shift mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lg shadow-primary/25">
        <Store className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-card-foreground">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function LoginForm() {
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
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>("/auth/login", { method: "POST", body: JSON.stringify(data) });
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
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="animate-slide-in-stagger space-y-4"
    >
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
        className="w-full rounded-full uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("submitLogin")}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

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
    });

  type FormData = z.input<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const { confirmPassword: _ignored, ...rest } = data;
      const res = await apiFetch<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...rest,
          email: rest.email || undefined,
          role: "ACHETEUR" as const,
        }),
      });
      setAuth({ ...res, user: { ...res.user, shops: [] } });
      toast.success(t("registerSuccess"));
      router.push("/marketplace");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("registerError"));
    }
  };

  return (
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      className="animate-slide-in-stagger space-y-4"
    >
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
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
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
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="registerPassword" required>
          {t("password")}
        </Label>
        <PasswordInput
          id="registerPassword"
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
        className="w-full rounded-full uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("submitRegister")}
      </Button>
    </form>
  );
}

/** Décor animé partagé : blobs, particules en orbite, formes dérivantes. */
function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="animate-morph-blob absolute -left-32 -top-32 h-[500px] w-[500px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl" />
      <div
        className="animate-morph-blob absolute -bottom-40 -right-40 h-[600px] w-[600px] bg-gradient-to-tl from-accent/20 via-primary/5 to-transparent blur-3xl"
        style={{ animationDelay: "-4s" }}
      />
      <div
        className="animate-morph-blob absolute left-1/2 top-1/3 h-[350px] w-[350px] -translate-x-1/2 bg-gradient-to-r from-primary/15 to-accent/10 blur-3xl"
        style={{ animationDelay: "-8s" }}
      />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="animate-orbit"
          style={{
            ["--orbit-radius" as string]: "230px",
            ["--orbit-duration" as string]: "18s",
          }}
        >
          <div className="h-3 w-3 rounded-full bg-primary/40 shadow-[0_0_14px_var(--primary)]" />
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="animate-orbit"
          style={{
            ["--orbit-radius" as string]: "300px",
            ["--orbit-duration" as string]: "27s",
            animationDirection: "reverse",
          }}
        >
          <div className="h-2.5 w-2.5 rounded-full bg-primary/25" />
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="animate-orbit"
          style={{
            ["--orbit-radius" as string]: "165px",
            ["--orbit-duration" as string]: "15s",
          }}
        >
          <div className="h-4 w-4 rounded-full bg-primary/25 shadow-[0_0_18px_var(--primary)]" />
        </div>
      </div>

      <div
        className="animate-drift-slow absolute left-[10%] top-[15%] h-16 w-16 rounded-lg border border-primary/15 bg-primary/5"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="animate-drift-slow absolute right-[12%] top-[70%] h-12 w-12 rounded-full border border-primary/10 bg-primary/5"
        style={{ animationDelay: "-10s" }}
      />
      <div
        className="animate-drift-slow absolute right-[20%] top-[25%] h-8 w-8 rotate-45 border border-accent/15 bg-accent/5"
        style={{ animationDelay: "-18s" }}
      />
      <div
        className="animate-drift-slow absolute bottom-[20%] left-[18%] h-10 w-10 rotate-12 rounded-lg border border-primary/10 bg-primary/5"
        style={{ animationDelay: "-6s" }}
      />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="animate-pulse-ring h-[430px] w-[430px] rounded-full border border-primary/10" />
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="animate-pulse-ring h-[580px] w-[580px] rounded-full border border-primary/5"
          style={{ animationDelay: "-2s" }}
        />
      </div>
    </div>
  );
}
