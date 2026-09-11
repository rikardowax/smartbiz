"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { FloatingAssistant } from "@/components/floating-assistant";
import { PwaInstallProvider } from "@/components/pwa-install-context";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ThemeProvider } from "@/components/theme-provider";

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
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
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
          {children}
          <Toaster richColors closeButton position="top-center" />
          <PwaInstallPrompt />
          <FloatingAssistant />
        </ThemeProvider>
      </PwaInstallProvider>
    </NextIntlClientProvider>
  );
}
