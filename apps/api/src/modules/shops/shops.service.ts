import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { paginate } from "../../common/dto/pagination.dto.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { uniqueSlug } from "../../common/utils/slug.util.js";
import { OrderStatus, ProductStatus, Role, ShopStatus } from "../../generated/prisma/enums.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type {
  CreateShopDto,
  CreateShopReviewDto,
  ShopSearchQueryDto,
  UpdateShopDto,
  UpdateShopStatusDto,
} from "./dto/shop.dto.js";

const PUBLIC_SHOP_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  coverUrl: true,
  phone: true,
  whatsappNumber: true,
  city: true,
  country: true,
  address: true,
  currency: true,
  ratingAverage: true,
  ratingCount: true,
  createdAt: true,
} as const;

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Un vendeur crée sa boutique. Le rôle est promu automatiquement si un
   * acheteur décide de se lancer dans la vente.
   */
  async create(user: AuthenticatedUser, dto: CreateShopDto) {
    const existing = await this.prisma.shop.count({ where: { ownerId: user.id } });
    if (existing >= 3) {
      throw new ConflictException("Vous ne pouvez pas gérer plus de trois boutiques");
    }

    const slug = await uniqueSlug(
      dto.name,
      async (candidate) => (await this.prisma.shop.count({ where: { slug: candidate } })) > 0,
    );

    const [shop] = await this.prisma.$transaction([
      this.prisma.shop.create({
        data: {
          ...dto,
          slug,
          ownerId: user.id,
          // La boutique est immédiatement exploitable ; la modération admin
          // peut la suspendre a posteriori.
          status: ShopStatus.ACTIVE,
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { role: user.role === Role.ACHETEUR ? Role.VENDEUR : user.role },
      }),
    ]);

    return shop;
  }

  /** Boutiques gérées par l'utilisateur connecté. */
  async findMine(userId: string) {
    return this.prisma.shop.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { products: true, orders: true, customers: true } },
      },
    });
  }

  async findOneForOwner(shopId: string) {
    return this.prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      include: { _count: { select: { products: true, orders: true, customers: true } } },
    });
  }

  async update(shopId: string, dto: UpdateShopDto) {
    return this.prisma.shop.update({ where: { id: shopId }, data: dto });
  }

  async remove(shopId: string, user: AuthenticatedUser) {
    const shop = await this.prisma.shop.findUniqueOrThrow({ where: { id: shopId } });
    if (shop.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException("Vous ne gérez pas cette boutique");
    }
    const pending = await this.prisma.order.count({
      where: { shopId, status: { in: ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED"] } },
    });
    if (pending > 0) {
      throw new ConflictException(
        `Impossible de supprimer : ${pending} commande(s) sont encore en cours`,
      );
    }
    await this.prisma.shop.delete({ where: { id: shopId } });
    return { success: true };
  }

  // --- Vitrine publique ----------------------------------------------------

  async findPublic(query: ShopSearchQueryDto) {
    const where = {
      status: ShopStatus.ACTIVE,
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" as const } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { description: { contains: query.search, mode: "insensitive" as const } },
              { city: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        select: {
          ...PUBLIC_SHOP_SELECT,
          _count: { select: { products: { where: { status: ProductStatus.ACTIVE } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.shop.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findPublicBySlug(slug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug, status: ShopStatus.ACTIVE },
      select: {
        ...PUBLIC_SHOP_SELECT,
        _count: { select: { products: { where: { status: ProductStatus.ACTIVE } } } },
        products: {
          where: { status: ProductStatus.ACTIVE },
          orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }],
          take: 12,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: true,
            unit: true,
            stockQuantity: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
      },
    });
    if (!shop) throw new NotFoundException("Boutique introuvable");
    return shop;
  }

  /** Villes disponibles, pour alimenter les filtres de la marketplace. */
  async listCities() {
    const rows = await this.prisma.shop.groupBy({
      by: ["city"],
      where: { status: ShopStatus.ACTIVE },
      orderBy: { _count: { city: "desc" } },
    });
    return rows.map((row) => row.city);
  }

  // --- Administration ------------------------------------------------------

  async findAllForAdmin(query: ShopSearchQueryDto) {
    const where = query.search
      ? { name: { contains: query.search, mode: "insensitive" as const } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
          _count: { select: { products: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.shop.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async updateStatus(shopId: string, dto: UpdateShopStatusDto) {
    return this.prisma.shop.update({ where: { id: shopId }, data: { status: dto.status } });
  }

  // --- Avis boutique ---------------------------------------------------------

  /** Avis publics d'une boutique (récents d'abord). */
  async listShopReviews(shopSlug: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { slug: shopSlug, status: ShopStatus.ACTIVE },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException("Boutique introuvable");

    const [reviews, aggregate] = await this.prisma.$transaction([
      this.prisma.shopReview.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.shopReview.aggregate({
        where: { shopId: shop.id },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return {
      reviews,
      ratingAverage: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
      ratingCount: aggregate._count,
    };
  }

  /** Dépose ou met à jour un avis — réservé aux clients ayant reçu une commande. */
  async createShopReview(shopId: string, userId: string, dto: CreateShopReviewDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException("Boutique introuvable");

    // Même règle que pour les produits : avis réservé à un achat livré.
    const purchased = await this.prisma.order.count({
      where: { shopId, buyerId: userId, status: OrderStatus.DELIVERED },
    });
    if (purchased === 0) {
      throw new ForbiddenException(
        "Vous ne pouvez évaluer qu'une boutique auprès de laquelle vous avez reçu une commande",
      );
    }

    await this.prisma.shopReview.upsert({
      where: { shopId_userId: { shopId, userId } },
      create: { shopId, userId, rating: dto.rating, comment: dto.comment },
      update: { rating: dto.rating, comment: dto.comment },
    });

    const aggregate = await this.prisma.shopReview.aggregate({
      where: { shopId },
      _avg: { rating: true },
      _count: true,
    });

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ratingAverage: Math.round((aggregate._avg.rating ?? 0) * 10) / 10,
        ratingCount: aggregate._count,
      },
      select: { id: true, ratingAverage: true, ratingCount: true },
    });
  }
}
