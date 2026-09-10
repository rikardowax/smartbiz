import type { Role } from "../../generated/prisma/enums.js";

/** Charge utile du JWT d'accès, injectée dans `request.user`. */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export interface JwtAccessPayload {
  sub: string;
  role: Role;
  phone: string;
  email: string | null;
  firstName: string;
  lastName: string;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}
