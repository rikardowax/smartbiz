import { SetMetadata } from "@nestjs/common";
import type { Role } from "../../generated/prisma/enums.js";

export const ROLES_KEY = "smartbiz:roles";

/** Restreint une route à un ou plusieurs rôles (RBAC). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
