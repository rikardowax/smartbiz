import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

const FAVORITE_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  compareAtPrice: true,
  unit: true,
  images: true,
  stockQuantity: true,
  ratingAverage: true,
  ratingCount: true,
  soldCount: true,
  category: { select: { name: true, slug: true } },
  shop: { select: { name: true, slug: true, city: true } },
} as const;

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste les produits favoris de l'utilisateur (les plus récents d'abord). */
  async list(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, product: { status: "ACTIVE" } },
      orderBy: { createdAt: "desc" },
      select: { productId: true, product: { select: FAVORITE_PRODUCT_SELECT } },
    });
    return favorites.map((f) => f.product);
  }

  /** Identifiants seuls — le front les charge une fois pour afficher les cœurs. */
  async ids(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
    });
    return favorites.map((f) => f.productId);
  }

  /** Bascule l'état favori : ajoute si absent, retire sinon. */
  async toggle(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Produit introuvable");

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.favorite.create({ data: { userId, productId } });
    return { favorited: true };
  }
}
