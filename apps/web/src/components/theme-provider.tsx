"use client";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes injecte un inline <script> pour éviter le flash de la mauvaise couleur au chargement.
// React 19 affiche une erreur/warning pour les balises <script> dans les composants.
// C'est un faux positif : le script s'exécute correctement côté serveur.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) {
      return;
    }
    original.apply(console, args as [string, ...unknown[]]);
  };
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
