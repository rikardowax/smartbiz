"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { CartAnimationProvider } from "@/components/add-to-cart-animation";
import { BuyerAssistant } from "@/components/buyer-assistant";
import { FloatingAssistant } from "@/components/floating-assistant";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ThemeProvider } from "@/components/theme-provider";

function registerPwaServiceWorker() {
  if ("serviceWorker" in navigator) {
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } else {
      // En dev, on désenregistre le SW pour éviter les caches périmés.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      });
    }
  }
}

export function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: string;
  messages: React.ComponentProps<typeof NextIntlClientProvider>["messages"];
}) {
  useEffect(() => {
    registerPwaServiceWorker();
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Africa/Douala">
      <PwaInstallProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CartAnimationProvider>
            {children}
            <Toaster richColors closeButton position="top-center" />
            <PwaInstallPrompt />
            <FloatingAssistant />
            <BuyerAssistant />
          </CartAnimationProvider>
        </ThemeProvider>
      </PwaInstallProvider>
    </NextIntlClientProvider>
  );
}
