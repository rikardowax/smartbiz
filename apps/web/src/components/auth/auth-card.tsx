"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

const FLIP_MS = 900;

/**
 * Carte unique qui bascule en 3D entre connexion et inscription.
 * Les deux formulaires restent montés : seule la rotation change, ce qui
 * évite de perdre la saisie en cours quand l'utilisateur hésite.
 */
export function AuthCard({ initialMode }: { initialMode: AuthMode }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [flipping, setFlipping] = useState(false);
  const [height, setHeight] = useState<number>();

  const loginRef = useRef<HTMLDivElement>(null);
  const registerRef = useRef<HTMLDivElement>(null);

  // La hauteur suit la face visible : sans cela, la face la plus courte
  // laisserait un vide sous la carte.
  const measure = useCallback(() => {
    const el = mode === "login" ? loginRef.current : registerRef.current;
    if (el) setHeight(el.offsetHeight);
  }, [mode]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const switchTo = (next: AuthMode) => {
    if (next === mode || flipping) return;
    setFlipping(true);
    setMode(next);
    // L'URL suit la face affichée pour que le rafraîchissement et le partage
    // restent cohérents, sans relancer de navigation Next.
    const path = window.location.pathname;
    const target = next === "login" ? "/login" : "/register";
    const source = next === "login" ? "/register" : "/login";
    if (path.endsWith(source)) {
      window.history.replaceState(null, "", path.slice(0, -source.length) + target);
    }
    setTimeout(() => setFlipping(false), FLIP_MS);
  };

  const flipped = mode === "register";

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden p-4 py-12">
      <AuthBackground />

      <div
        className={cn(
          "auth-flip-scene relative z-10 w-full max-w-md",
          flipping && "animate-flip-dip",
        )}
      >
        {/* Halo qui s'illumine pendant la rotation */}
        {flipping && (
          <div className="animate-flip-glow pointer-events-none absolute -inset-8 rounded-[2rem] bg-primary/25 blur-3xl" />
        )}

        <div
          className={cn("auth-flip-inner relative w-full", flipped && "is-flipped")}
          style={{ height }}
        >
          <div
            ref={loginRef}
            className={cn("auth-face absolute inset-x-0 top-0", flipped && "pointer-events-none")}
            aria-hidden={flipped}
          >
            <AuthShell flipping={flipping} title={t("loginTitle")} subtitle={t("loginSubtitle")}>
              <LoginForm />
              <AuthDivider label={t("orContinueWith")} />
              <GoogleLoginButton />
              <SwitchPrompt
                question={t("noAccount")}
                action={t("registerNow")}
                onClick={() => switchTo("register")}
              />
            </AuthShell>
          </div>

          <div
            ref={registerRef}
            className={cn(
              "auth-face auth-face-back absolute inset-x-0 top-0",
              !flipped && "pointer-events-none",
            )}
            aria-hidden={!flipped}
          >
            <AuthShell
              flipping={flipping}
              title={t("registerTitle")}
              subtitle={t("registerSubtitle")}
            >
              <RegisterForm />
              <AuthDivider label={t("orContinueWith")} />
              <GoogleLoginButton />
              <SwitchPrompt
                question={t("hasAccount")}
                action={t("loginNow")}
                onClick={() => switchTo("login")}
              />
            </AuthShell>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Habillage commun aux deux faces : logo, titres, bordure lumineuse. */
function AuthShell({
  title,
  subtitle,
  flipping,
  children,
}: {
  title: string;
  subtitle: string;
  flipping: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="animate-shimmer-border absolute -inset-px rounded-2xl" />
      {/* Pas de backdrop-filter ici : il aplatit le contexte 3D du flip. */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-8 shadow-2xl">
        {/* Reflet qui traverse la carte au moment de la bascule */}
        {flipping && (
          <div className="animate-shine-sweep pointer-events-none absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-white/25 to-transparent dark:via-white/10" />
        )}

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lg shadow-primary/25 animate-gradient-shift">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {children}
      </div>
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

function SwitchPrompt({
  question,
  action,
  onClick,
}: {
  question: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="mt-6 text-center text-sm text-muted-foreground">
      {question}{" "}
      <button
        type="button"
        onClick={onClick}
        className="font-semibold text-primary underline-offset-2 hover:underline"
      >
        {action}
      </button>
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
    <form onSubmit={handleSubmit(onSubmit)} className="animate-slide-in-stagger space-y-4">
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
        className="w-full shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
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
    <form onSubmit={handleSubmit(onSubmit)} className="animate-slide-in-stagger space-y-4">
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
        className="w-full shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
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
