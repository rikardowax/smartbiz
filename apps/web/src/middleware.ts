import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Ignore l'API, les assets Next et les fichiers statiques (icônes, sw.js,
  // manifest) — tout le reste passe par la résolution de locale.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
