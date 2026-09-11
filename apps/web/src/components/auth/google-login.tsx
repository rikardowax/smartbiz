"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { type User, useAuthStore } from "@/stores/auth-store";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement | null, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleLoginButton() {
  const t = useTranslations("auth");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (!window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            const res = await apiFetch<{
              accessToken: string;
              refreshToken: string;
              user: User;
            }>("/auth/google", {
              method: "POST",
              body: JSON.stringify({ credential: response.credential }),
            });
            setAuth(res);
            const me = await apiFetch<User>("/auth/me");
            setUser(me);
            toast.success(t("loginSuccess"));
            router.push("/dashboard");
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : t("loginError"));
          }
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: "100%",
      });
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [clientId, router, setAuth, setUser, t]);

  if (!clientId) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        NEXT_PUBLIC_GOOGLE_CLIENT_ID manquant
      </p>
    );
  }

  return <div ref={buttonRef} className="w-full" />;
}
