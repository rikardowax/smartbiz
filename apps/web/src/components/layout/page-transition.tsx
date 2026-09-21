"use client";

import { usePathname } from "@/i18n/navigation";

/**
 * Rejoue l'animation d'entrée à chaque changement de route : la clé force le
 * remontage du sous-arbre, ce que le layout partagé ne ferait pas seul.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-enter">
      {children}
    </div>
  );
}
