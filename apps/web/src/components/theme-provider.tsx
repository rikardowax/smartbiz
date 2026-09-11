"use client";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Certains navigateurs/extensions ajoutent des attributs aux éléments hydratés
// (ex. bis_skin_checked) ce qui produit des warnings d'hydratation hors de notre contrôle.
// Le warning "Encountered a script tag" de next-themes est aussi filtré en dev.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    const head = args[0];
    let message = "";
    if (typeof head === "string") {
      message = head;
    } else if (head instanceof Error) {
      message = head.message;
    }

    if (
      message.includes("bis_skin_checked") ||
      message.includes("cz-shortcut-listen") ||
      message.includes("data-new-gr-c-s-check-loaded") ||
      message.includes("Encountered a script tag") ||
      message.includes("A tree hydrated but some attributes") ||
      message.includes("server rendered HTML") ||
      message.includes("didn't match") ||
      message.includes("didn’t match") ||
      message.includes("did not match")
    ) {
      return;
    }

    original.apply(console, args as [string, ...unknown[]]);
  };
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
