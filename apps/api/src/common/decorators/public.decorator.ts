import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "smartbiz:isPublic";

/** Rend une route accessible sans jeton d'accès. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
