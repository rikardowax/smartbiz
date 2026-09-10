import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Request } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { AuthenticatedUser } from "../types/authenticated-user.js";

/**
 * Protège toutes les routes imbriquées sous `:shopId` : seul le propriétaire
 * de la boutique (ou un administrateur) peut y accéder. La boutique résolue est
 * attachée à la requête pour éviter une seconde lecture en base.
 */
@Injectable()
export class ShopAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & {
        user?: AuthenticatedUser;
        shop?: { id: string; ownerId: string; currency: string };
      }
    >();

    const shopId = typeof request.params?.shopId === "string" ? request.params.shopId : undefined;
    if (!shopId) throw new BadRequestException("Identifiant de boutique manquant");

    const user = request.user;
    if (!user) throw new ForbiddenException("Authentification requise");

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, ownerId: true, currency: true },
    });
    if (!shop) throw new NotFoundException("Boutique introuvable");

    if (shop.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException("Vous ne gérez pas cette boutique");
    }

    request.shop = shop;
    return true;
  }
}
