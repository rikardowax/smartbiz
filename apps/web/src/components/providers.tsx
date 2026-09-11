"use client";

import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "sonner";

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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster richColors closeButton position="top-center" />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
